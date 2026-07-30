require "test_helper"

# =========================================================
# 🔐 Este archivo existe por una vulnerabilidad REAL.
#
# Hasta el 2026-07-30, `NotebooksController` no incluía `InternalApiAuth` y
# Rails corre con `ingress: all` en Cloud Run. Los dos endpoints de escritura
# estaban abiertos a internet: cualquiera podía inyectar productos con SUS
# links de afiliado, o noticias con enlaces arbitrarios en el ticker del home.
#
# Este test es la red que faltaba. Si alguien vuelve a exponer una escritura,
# la suite falla antes del deploy.
# =========================================================
class InternalApiAuthTest < ActionDispatch::IntegrationTest
  KEY = "clave-interna-de-prueba".freeze

  setup do
    @previous_key = ENV["INTERNAL_API_KEY"]
    ENV["INTERNAL_API_KEY"] = KEY
    @retailer = create_retailer(slug: "test_us")
  end

  teardown { ENV["INTERNAL_API_KEY"] = @previous_key }

  def auth_headers(key = KEY)
    { "X-Internal-Key" => key, "CONTENT_TYPE" => "application/json" }
  end

  # ── Las escrituras EXIGEN la clave ──────────────────────────────────────

  test "POST /notebooks sin clave devuelve 401" do
    post "/api/v1/notebooks", params: normalized_offer.to_json,
                              headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :unauthorized
  end

  test "POST /notebooks sin clave NO persiste nada" do
    assert_no_difference "Laptop.count" do
      post "/api/v1/notebooks", params: normalized_offer.to_json,
                                headers: { "CONTENT_TYPE" => "application/json" }
    end
  end

  test "POST /hardware_news sin clave devuelve 401" do
    post "/api/v1/notebooks/hardware_news",
         params: { news: [{ category: "X", title: "Inyectada", summary: "S" }] }.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :unauthorized
  end

  test "POST /hardware_news sin clave NO persiste nada" do
    assert_no_difference "HardwareNews.count" do
      post "/api/v1/notebooks/hardware_news",
           params: { news: [{ category: "X", title: "Inyectada", summary: "S" }] }.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
    end
  end

  test "una clave incorrecta se rechaza igual que la ausencia de clave" do
    post "/api/v1/notebooks", params: normalized_offer.to_json,
                              headers: auth_headers("clave-equivocada")
    assert_response :unauthorized
  end

  test "una clave con el prefijo correcto pero incompleta se rechaza" do
    post "/api/v1/notebooks", params: normalized_offer.to_json,
                              headers: auth_headers(KEY[0..5])
    assert_response :unauthorized
  end

  test "una clave vacia se rechaza" do
    post "/api/v1/notebooks", params: normalized_offer.to_json, headers: auth_headers("")
    assert_response :unauthorized
  end

  # ── Con la clave correcta, la escritura funciona ────────────────────────

  test "POST /notebooks con clave valida persiste el producto" do
    assert_difference "Laptop.count", 1 do
      post "/api/v1/notebooks", params: normalized_offer.to_json, headers: auth_headers
    end
    assert_response :created
  end

  test "POST /hardware_news con clave valida persiste la noticia" do
    assert_difference "HardwareNews.count", 1 do
      post "/api/v1/notebooks/hardware_news",
           params: { news: [{ category: "GPU", title: "Titular real", summary: "Resumen" }] }.to_json,
           headers: auth_headers
    end
    assert_response :created
  end

  # ── Las LECTURAS siguen siendo públicas (las consume el SSR) ────────────

  test "GET /notebooks es publico" do
    get "/api/v1/notebooks", params: { country: "US", limit: 1 }
    assert_response :success
  end

  test "GET /hardware_news es publico" do
    get "/api/v1/notebooks/hardware_news", params: { country: "US" }
    assert_response :success
  end

  test "GET /notebooks/sitemap es publico" do
    get "/api/v1/notebooks/sitemap"
    assert_response :success
  end

  test "GET /geo es publico" do
    get "/api/v1/geo", params: { country: "US" }
    assert_response :success
  end

  # ── Rutas por usuario: protegidas contra IDOR ───────────────────────────

  test "las rutas por usuario exigen la clave interna" do
    uuid = "00000000-0000-0000-0000-000000000000"
    %w[favorites price_alerts profile].each do |resource|
      get "/api/v1/users/#{uuid}/#{resource}"
      assert_response :unauthorized, "#{resource} quedó expuesta"
    end
  end

  # ── Guarda de configuración ─────────────────────────────────────────────

  test "si INTERNAL_API_KEY no esta seteada se rechaza TODA escritura" do
    ENV["INTERNAL_API_KEY"] = ""
    post "/api/v1/notebooks", params: normalized_offer.to_json, headers: auth_headers("cualquier-cosa")
    # Fail-closed: sin clave configurada nadie escribe, ni con la clave "correcta".
    assert_response :unauthorized
  end
end

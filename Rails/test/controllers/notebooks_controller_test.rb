require "test_helper"

# =========================================================
# 📡 Tests del serializer DTO y el endpoint del sitemap.
#
# El DTO es el contrato inmutable con `Web/src/types/laptop.ts`: si una clave
# cambia de nombre o de forma, el frontend rompe en silencio (los campos
# opcionales de TS no avisan en runtime). Estos tests fijan la forma.
# =========================================================
class NotebooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @retailer = create_retailer(slug: "amazon_us")
    @laptop = create_laptop(
      retailer: @retailer,
      sku: "SKU-DTO",
      country_code: "US",
      image_url: "https://m.media-amazon.com/images/I/71abc.jpg"
    )
    PriceHistory.create!(
      laptop_id: @laptop.id, precio_actual: 999.0, precio_original: 1299.0,
      moneda: "USD", es_oferta_destacada: false
    )
  end

  def dto
    get "/api/v1/notebooks", params: { country: "US", limit: 10 }
    JSON.parse(response.body).find { |p| p["slug"] == @laptop.slug }
  end

  # ── Forma del DTO ───────────────────────────────────────────────────────

  test "el DTO expone las claves de primer nivel del contrato" do
    %w[id slug country_code currency brand name condition product_type
       specs hardware financials intelligence seo urls metadata_extra].each do |clave|
      assert dto.key?(clave), "el DTO perdió la clave '#{clave}' (rompe laptop.ts)"
    end
  end

  test "financials tiene la forma esperada" do
    f = dto["financials"]
    %w[original_price current_price discount_pct in_stock].each do |k|
      assert f.key?(k), "financials.#{k} falta"
    end
    assert_equal 999.0, f["current_price"].to_f
  end

  test "intelligence tiene la forma esperada" do
    i = dto["intelligence"]
    %w[deal_score ai_score_label ai_reasoning price_trend category is_featured_deal].each do |k|
      assert i.key?(k), "intelligence.#{k} falta"
    end
  end

  test "urls solo expone image y affiliate_raw" do
    assert_equal %w[image affiliate_raw].sort, dto["urls"].keys.sort
  end

  test "metadata_extra incluye el slug del retailer" do
    assert_equal "amazon_us", dto["metadata_extra"]["retailer"]
  end

  # ── El serializer nunca emite una foto de stock ─────────────────────────

  test "urls.image devuelve la foto real cuando existe" do
    assert_equal "https://m.media-amazon.com/images/I/71abc.jpg", dto["urls"]["image"]
  end

  test "urls.image es null cuando no hay foto" do
    @laptop.update_column(:image_url, nil)
    assert_nil dto["urls"]["image"]
  end

  test "una foto de stock ya no puede ni almacenarse (el CHECK lo impide)" do
    # Se intentó simular una fila heredada con `update_column` —que saltea las
    # validaciones de Rails— y el motor la rechazó igual: `chk_laptops_no_stock_image`
    # actúa a nivel Postgres, así que ni con SQL directo entra. La guarda de
    # `real_image_url` en el modelo queda como defensa redundante, no como el
    # único freno. Se afirma la imposibilidad en vez de la filtración.
    assert_raises(ActiveRecord::StatementInvalid) do
      @laptop.update_column(:image_url, "https://images.unsplash.com/photo-1.jpg")
    end
  end

  # ── Filtros del catálogo ────────────────────────────────────────────────

  test "filtra por pais" do
    create_laptop(country_code: "AR")
    get "/api/v1/notebooks", params: { country: "US", limit: 50 }
    assert JSON.parse(response.body).all? { |p| p["country_code"] == "US" }
  end

  test "filtra por tipo de producto" do
    create_laptop(product_type: "monitor", country_code: "US")
    get "/api/v1/notebooks", params: { country: "US", type: "monitor", limit: 50 }
    cuerpo = JSON.parse(response.body)
    assert cuerpo.any?
    assert cuerpo.all? { |p| p["product_type"] == "monitor" }
  end

  test "busca por slug para la pagina de detalle" do
    get "/api/v1/notebooks", params: { slug: @laptop.slug }
    cuerpo = JSON.parse(response.body)
    assert_equal 1, cuerpo.length
    assert_equal @laptop.slug, cuerpo.first["slug"]
  end

  test "el limit se recorta a 100 para que nadie pida el catalogo entero" do
    get "/api/v1/notebooks", params: { country: "US", limit: 99_999 }
    assert_response :success
    assert_operator JSON.parse(response.body).length, :<=, 100
  end

  test "un pais inexistente devuelve lista vacia, no error" do
    get "/api/v1/notebooks", params: { country: "ZZ" }
    assert_response :success
    assert_equal [], JSON.parse(response.body)
  end

  # ── Endpoint del sitemap ────────────────────────────────────────────────

  test "el sitemap devuelve slug y updated_at de todo el catalogo" do
    create_laptop(country_code: "AR")  # otro país: debe aparecer igual
    get "/api/v1/notebooks/sitemap"
    assert_response :success

    cuerpo = JSON.parse(response.body)
    assert_equal Laptop.count, cuerpo.length, "el sitemap no debe filtrar por país"
    # `product_type` y `name` viajan para que `isIndexableProduct` (TypeScript)
    # sea el ÚNICO dueño del criterio de indexación. Ver la nota en la acción.
    assert_equal %w[name product_type slug updated_at], cuerpo.first.keys.sort
    assert cuerpo.all? { |r| r["slug"].present? }
  end

  test "el sitemap trae updated_at real (no nulo) para el lastmod" do
    get "/api/v1/notebooks/sitemap"
    assert JSON.parse(response.body).all? { |r| r["updated_at"].present? },
           "un <lastmod> ausente o inventado degrada el rate de rastreo"
  end

  test "el sitemap no aplica el clamp de 100 que si aplica index" do
    # Es la razón de que exista como endpoint propio: con >100 productos por
    # país, reusar `index` perdería filas EN SILENCIO. Se verifica que el
    # sitemap devuelve TODO aunque se le pasen los params que `index` respeta.
    get "/api/v1/notebooks/sitemap", params: { country: "AR", limit: 1 }
    assert_equal Laptop.count, JSON.parse(response.body).length,
                 "el sitemap no debe honrar country ni limit"
  end

  # ── Noticias ────────────────────────────────────────────────────────────

  test "hardware_news sirve las globales y las del pais" do
    # `title` tiene índice único: se aleatoriza para no chocar entre corridas.
    global = "Global #{SecureRandom.hex(4)}"
    regional = "Solo ES #{SecureRandom.hex(4)}"
    HardwareNews.create!(category: "GPU", title: global, summary: "S", country_code: nil)
    HardwareNews.create!(category: "GPU", title: regional, summary: "S", country_code: "ES")

    get "/api/v1/notebooks/hardware_news", params: { country: "US" }
    titulos = JSON.parse(response.body).map { |n| n["title"] }
    assert_includes titulos, global
    assert_not_includes titulos, regional, "una noticia regional se filtró a otro país"
  end

  test "hardware_news expone source_url como sourceUrl" do
    # Regresión del drift de esquema: `source_url` existía en producción pero
    # no en los .sql del repo, así que sobre una base reconstruida esta query
    # lanzaba PG::UndefinedColumn y el rescue devolvía [] con status 200 —
    # el sitio se quedaba sin noticias sin ningún error visible.
    url = "https://www.tomshardware.com/articulo-#{SecureRandom.hex(3)}"
    HardwareNews.create!(
      category: "GPU", title: "Con fuente #{SecureRandom.hex(4)}",
      summary: "S", country_code: nil, source_url: url
    )

    get "/api/v1/notebooks/hardware_news", params: { country: "US" }
    assert_response :success
    assert_includes JSON.parse(response.body).map { |n| n["sourceUrl"] }, url
  end
end

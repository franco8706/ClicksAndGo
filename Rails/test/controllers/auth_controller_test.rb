require "test_helper"

# =========================================================
# 🔐 Adapter de NextAuth servido por Rails.
#
# Estos endpoints reemplazan las 14 queries directas que `Web/src/auth.ts`
# hacía contra Postgres con su propio pool. Si alguno se comporta distinto al
# SQL que reemplaza, se rompe el login — así que los tests fijan el contrato
# exacto que NextAuth espera (incluidas las claves en camelCase).
# =========================================================
class AuthControllerTest < ActionDispatch::IntegrationTest
  KEY = "clave-de-prueba-auth"

  setup do
    @clave_previa = ENV["INTERNAL_API_KEY"]
    ENV["INTERNAL_API_KEY"] = KEY
  end

  teardown { ENV["INTERNAL_API_KEY"] = @clave_previa }

  def headers
    { "X-Internal-Key" => KEY, "CONTENT_TYPE" => "application/json" }
  end

  def crear_usuario(email: "a@b.com")
    post "/api/v1/auth/users", params: { name: "Ana", email: email }.to_json, headers: headers
    JSON.parse(response.body)
  end

  # ── Protección: estos endpoints CREAN sesiones ──────────────────────────

  test "sin la clave interna NO se puede fabricar una sesion" do
    post "/api/v1/auth/sessions",
         params: { userId: SecureRandom.uuid, sessionToken: "x", expires: 1.day.from_now }.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :unauthorized
  end

  test "sin la clave interna no se puede leer una sesion ajena" do
    post "/api/v1/auth/sessions/lookup",
         params: { sessionToken: "x" }.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
    assert_response :unauthorized
  end

  # ── Usuarios ────────────────────────────────────────────────────────────

  test "crea un usuario y devuelve el contrato de NextAuth" do
    cuerpo = crear_usuario
    assert_response :created
    # `emailVerified` en camelCase: es lo que espera `AdapterUser`.
    assert_equal %w[email emailVerified id image name], cuerpo.keys.sort
    assert_equal "a@b.com", cuerpo["email"]
  end

  test "busca por id y devuelve null si no existe" do
    u = crear_usuario(email: "id@b.com")
    get "/api/v1/auth/users/#{u['id']}", headers: headers
    assert_equal u["id"], JSON.parse(response.body)["id"]

    get "/api/v1/auth/users/#{SecureRandom.uuid}", headers: headers
    assert_response :ok
    assert_nil JSON.parse(response.body)
  end

  test "busca por email sin exponerlo en la URL" do
    crear_usuario(email: "buscar@b.com")
    post "/api/v1/auth/users/lookup", params: { email: "buscar@b.com" }.to_json, headers: headers
    assert_equal "buscar@b.com", JSON.parse(response.body)["email"]
  end

  test "un email inexistente devuelve null, no un error" do
    post "/api/v1/auth/users/lookup", params: { email: "nadie@b.com" }.to_json, headers: headers
    assert_response :ok
    assert_nil JSON.parse(response.body)
  end

  test "actualizar NO borra los campos que no se mandan" do
    # Réplica del COALESCE del SQL original: es lo que impide que un update
    # parcial vacíe el nombre o la foto del usuario.
    u = crear_usuario(email: "coalesce@b.com")
    patch "/api/v1/auth/users/#{u['id']}", params: { image: "https://x/y.png" }.to_json, headers: headers
    cuerpo = JSON.parse(response.body)
    assert_equal "Ana", cuerpo["name"], "un update parcial no debe borrar el nombre"
    assert_equal "https://x/y.png", cuerpo["image"]
  end

  # ── Cuentas OAuth ───────────────────────────────────────────────────────

  test "vincula una cuenta y encuentra al usuario por ella" do
    u = crear_usuario(email: "oauth@b.com")
    post "/api/v1/auth/accounts",
         params: { userId: u["id"], type: "oauth", provider: "google",
                   providerAccountId: "g-1", access_token: "t1" }.to_json,
         headers: headers
    assert_response :created

    post "/api/v1/auth/users/lookup",
         params: { provider: "google", providerAccountId: "g-1" }.to_json, headers: headers
    assert_equal u["id"], JSON.parse(response.body)["id"]
  end

  test "reautenticarse con el mismo proveedor refresca el token, no falla" do
    # El SQL original hacía ON CONFLICT DO UPDATE. Sin eso, volver a entrar
    # con Google reventaría por clave duplicada.
    u = crear_usuario(email: "refresh@b.com")
    2.times do |i|
      post "/api/v1/auth/accounts",
           params: { userId: u["id"], type: "oauth", provider: "google",
                     providerAccountId: "g-2", access_token: "token-#{i}" }.to_json,
           headers: headers
      assert_response :created
    end
    assert_equal 1, Account.where(provider: "google", provider_account_id: "g-2").count
    assert_equal "token-1", Account.find_by(provider_account_id: "g-2").access_token
  end

  test "desvincular una cuenta la borra" do
    u = crear_usuario(email: "unlink@b.com")
    post "/api/v1/auth/accounts",
         params: { userId: u["id"], type: "oauth", provider: "google",
                   providerAccountId: "g-3" }.to_json, headers: headers
    post "/api/v1/auth/accounts/unlink",
         params: { provider: "google", providerAccountId: "g-3" }.to_json, headers: headers
    assert_equal 0, Account.where(provider_account_id: "g-3").count
  end

  # ── Sesiones — el camino más caliente del sistema ───────────────────────

  test "crea una sesion y la recupera con su usuario en una sola llamada" do
    u = crear_usuario(email: "sesion@b.com")
    vence = 1.day.from_now
    post "/api/v1/auth/sessions",
         params: { userId: u["id"], sessionToken: "tok-1", expires: vence }.to_json,
         headers: headers
    assert_response :created

    post "/api/v1/auth/sessions/lookup", params: { sessionToken: "tok-1" }.to_json, headers: headers
    cuerpo = JSON.parse(response.body)
    # NextAuth espera exactamente estas dos claves y este anidamiento.
    assert_equal %w[session user], cuerpo.keys.sort
    assert_equal u["id"], cuerpo["user"]["id"]
    assert_equal "tok-1", cuerpo["session"]["sessionToken"]
  end

  test "un token inexistente devuelve null, no un error" do
    post "/api/v1/auth/sessions/lookup", params: { sessionToken: "no-existe" }.to_json, headers: headers
    assert_response :ok
    assert_nil JSON.parse(response.body)
  end

  test "actualizar la sesion extiende su vencimiento" do
    u = crear_usuario(email: "extender@b.com")
    post "/api/v1/auth/sessions",
         params: { userId: u["id"], sessionToken: "tok-2", expires: 1.hour.from_now }.to_json,
         headers: headers
    nuevo = 30.days.from_now
    post "/api/v1/auth/sessions/update",
         params: { sessionToken: "tok-2", expires: nuevo }.to_json, headers: headers
    assert_response :ok
    assert_in_delta nuevo.to_i, Session.find_by(session_token: "tok-2").expires.to_i, 2
  end

  test "cerrar sesion la borra de verdad" do
    u = crear_usuario(email: "logout@b.com")
    post "/api/v1/auth/sessions",
         params: { userId: u["id"], sessionToken: "tok-3", expires: 1.day.from_now }.to_json,
         headers: headers
    post "/api/v1/auth/sessions/delete", params: { sessionToken: "tok-3" }.to_json, headers: headers
    assert_equal 0, Session.where(session_token: "tok-3").count
  end

  # ── Magic links ─────────────────────────────────────────────────────────

  test "un magic link se consume UNA sola vez" do
    # Si no se borrara al usarlo, el enlace del email quedaría reutilizable
    # para siempre: cualquiera con acceso al correo entraría cuando quisiera.
    post "/api/v1/auth/verification_tokens",
         params: { identifier: "m@b.com", token: "magic-1", expires: 1.hour.from_now }.to_json,
         headers: headers
    assert_response :created

    post "/api/v1/auth/verification_tokens/use",
         params: { identifier: "m@b.com", token: "magic-1" }.to_json, headers: headers
    assert_equal "magic-1", JSON.parse(response.body)["token"]

    post "/api/v1/auth/verification_tokens/use",
         params: { identifier: "m@b.com", token: "magic-1" }.to_json, headers: headers
    assert_nil JSON.parse(response.body), "el segundo uso debe fallar"
  end
end

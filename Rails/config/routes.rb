Rails.application.routes.draw do
  # =========================================================
  # 🩺 HEALTHCHECK (Latencia Cero)
  # Endpoint estándar de Rails 7.1+ para que Docker/Kubernetes 
  # verifiquen si el servidor está vivo sin golpear la base de datos.
  # =========================================================
  get "up" => "rails/health#show", as: :rails_health_check

  # =========================================================
  # 🌐 API REST (v4.0)
  # Forzamos por defecto el formato JSON. Si un atacante intenta 
  # pedir .html o .xml, Rails lo rechaza automáticamente ahorrando CPU.
  # =========================================================
  namespace :api, defaults: { format: :json } do
    namespace :v1 do

      # 🌍 Geolocalización compartida (Web + App móvil):
      # resuelve el país del visitante por IP en un solo lugar.
      get :geo, to: "geo#show"

      # ── 🔐 Adapter de NextAuth ────────────────────────────────────────
      # Devuelve Postgres a Rails: `Web/src/auth.ts` abría su propio pool.
      #
      # ⚠️ Los lookups de sesión y de token son POST aunque sean lecturas.
      # `session_token` es una credencial portadora y una URL termina en los
      # logs de acceso — eso convertiría el log en un almacén de sesiones
      # robables. El email va por el mismo camino por ser dato personal.
      scope "auth" do
        post   "users",                    to: "auth#create_user"
        post   "users/lookup",             to: "auth#lookup_user"
        get    "users/:id",                to: "auth#find_user"
        patch  "users/:id",                to: "auth#update_user"
        delete "users/:id",                to: "auth#delete_user"
        post   "accounts",                 to: "auth#link_account"
        post   "accounts/unlink",          to: "auth#unlink_account"
        post   "sessions",                 to: "auth#create_session"
        post   "sessions/lookup",          to: "auth#lookup_session"
        post   "sessions/update",          to: "auth#update_session"
        post   "sessions/delete",          to: "auth#delete_session"
        post   "verification_tokens",      to: "auth#create_verification_token"
        post   "verification_tokens/use",  to: "auth#use_verification_token"
      end

      # 💻 Dominio: Laptops / Notebooks (endpoint histórico, retrocompatible)
      resources :notebooks, only: [:index, :create] do
        collection do
          # 📡 Ruta GET: Consumida por el Frontend (Next.js) para mostrar el slider de noticias
          get :hardware_news

          # 📥 Ruta POST: Consumida por el Cerebro (Python / NewsRadarAgent) para inyectar noticias
          post :hardware_news, action: :create_news

          # 🗺️ Ruta GET: índice liviano {slug, updated_at} de TODO el catálogo,
          #    consumido por Web/src/app/sitemap.ts. Sin filtro de país y sin
          #    el clamp de 100 de `index` — ver comentario en el controller.
          get :sitemap
        end
      end

      # 📦 Dominio: Catálogo MULTI-PRODUCTO (generalización de notebooks).
      #    Mismo controller/serializer; acepta ?type=<product_type>&country=&limit=.
      #    Ej: /api/v1/products?type=monitor&country=US
      #    `notebooks` queda como alias histórico (solo laptops si se filtra por tipo).
      get  "products",      to: "notebooks#index"
      post "products",      to: "notebooks#create"

      # 📂 Árbol de navegación con conteos reales (taxonomía v8).
      #    Ej: /api/v1/products/categories?country=US
      #    Lectura pública: la consume el SSR de Next.js para pintar el menú.
      get  "products/categories", to: "notebooks#categories"

      # 📦 Ingesta por lotes (hasta 500 productos por request).
      #    Escritura: protegida por InternalApiAuth como el resto de los POST.
      post "products/batch", to: "notebooks#create_batch"

      # 🔢 Backfill de scoring. La cacería diaria solo re-puntúa lo que la red
      #    devuelve hoy, así que lo ingerido antes de que el ciclo funcionara
      #    se queda en `deal_score = 0` para siempre si nadie lo va a buscar.
      #    Ambos protegidos por InternalApiAuth: el listado expone el catálogo
      #    con sus specs y la escritura toca la base.
      get  "products/unscored", to: "notebooks#unscored"
      post "products/scores",   to: "notebooks#update_scores"

      # =========================================================
      # 🔔 DESPACHO DE ALERTAS DE PRECIO (system-level)
      # Consumido por el PriceAlertAgent (Python) tras cada ciclo de precios.
      # Protegido por InternalApiAuth (clave compartida). No confundir con
      # las rutas por-usuario `users/:user_id/price_alerts` de arriba.
      # =========================================================
      get  "price_alerts/pending",       to: "alert_dispatch#pending"
      post "price_alerts/mark_notified", to: "alert_dispatch#mark_notified"

      # =========================================================
      # 👤 CUENTA DE USUARIO (perfil, favoritos, alertas de precio)
      # Rails es el único dueño de lectura/escritura a Postgres — Next.js
      # consume estas rutas por fetch en vez de conectarse a la DB directo.
      # Protegidas por InternalApiAuth (clave compartida, ver concern).
      # =========================================================
      scope "users/:user_id" do
        get   "profile", to: "users#show_profile"
        patch "profile", to: "users#update_profile"
        patch "geo",     to: "users#update_geo"

        get    "favorites",            to: "favorites#index"
        post   "favorites",            to: "favorites#create"
        post   "favorites/toggle",     to: "favorites#toggle"
        delete "favorites/:laptop_id", to: "favorites#destroy"

        get    "price_alerts",     to: "price_alerts#index"
        post   "price_alerts",     to: "price_alerts#create"
        delete "price_alerts/:id", to: "price_alerts#destroy"
      end

    end
  end
end
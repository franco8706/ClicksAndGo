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
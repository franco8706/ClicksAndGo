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

      # 💻 Dominio: Laptops / Notebooks
      resources :notebooks, only: [:index, :create] do
        collection do
          # 📡 Ruta GET: Consumida por el Frontend (Next.js) para mostrar el slider de noticias
          get :hardware_news
          
          # 📥 Ruta POST: Consumida por el Cerebro (Python / NewsRadarAgent) para inyectar noticias
          post :hardware_news, action: :create_news
        end
      end
      
    end
  end
end
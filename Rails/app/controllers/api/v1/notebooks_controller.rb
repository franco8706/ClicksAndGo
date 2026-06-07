module Api
  module V1
    class NotebooksController < ApplicationController
      # 🛡️ Zero-Trust: Permite a los microservicios internos hacer POST sin token de formulario
      # skip_before_action :verify_authenticity_token, only: [:create, :create_news]

      # =========================================================
      # 💻 ENDPOINT: GET /api/v1/notebooks
      # =========================================================
      def index
        if params[:slug].present?
          result = Rails.cache.fetch("notebooks/slug/#{params[:slug]}", expires_in: 5.minutes) do
            Laptop.includes(:retailer, :latest_price)
                  .where(slug: params[:slug])
                  .limit(1)
                  .map { |l| serialize_laptop(l) }
          end
        else
          country = (params[:country].presence || 'US').upcase[0, 2]
          limit   = (params[:limit] || 40).to_i.clamp(1, 100)
          result  = Rails.cache.fetch("notebooks/catalog/#{country}", expires_in: 60.seconds) do
            Laptop.includes(:retailer, :latest_price)
                  .where(country_code: country)
                  .limit(limit)
                  .map { |l| serialize_laptop(l) }
          end
        end

        render json: result, status: :ok
      end

      # =========================================================
      # 📡 ENDPOINT: GET /api/v1/notebooks/hardware_news
      # =========================================================
      def hardware_news
        country_raw = params[:country].to_s.upcase[0, 2].presence || 'US'
        cache_key   = "hardware_news/#{country_raw}"

        result = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
          country = ActiveRecord::Base.connection.quote(country_raw)
          sql = <<-SQL
            SELECT category, title, summary, impact_score AS "impactScore", recorded_at AS "recordedAt"
            FROM hardware_news
            WHERE country_code = #{country} OR country_code IS NULL
            ORDER BY recorded_at DESC LIMIT 20
          SQL
          ActiveRecord::Base.connection.execute(sql).to_a
        end

        render json: result, status: :ok
      rescue StandardError => e
        Rails.logger.error("🚨 [HardwareNews API] Fallo al extraer inteligencia de la DB: #{e.message}")
        render json: [], status: :ok
      end

      # =========================================================
      # 📥 ENDPOINT: POST /api/v1/notebooks/hardware_news
      # =========================================================
      def create_news
        payload = params.to_unsafe_h.deep_symbolize_keys
        news_batch = payload[:news] || []
        
        PersistenceOrchestrator.save_news_batch(news_batch)
        render json: { status: 'SUCCESS', message: "#{news_batch.length} noticias procesadas" }, status: :created
      rescue => e
        Rails.logger.error("🚨 [Create News API] Fallo crítico: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo al guardar noticias' }, status: :internal_server_error
      end

      # =========================================================
      # 📥 ENDPOINT: POST /api/v1/notebooks
      # =========================================================
      def create
        # 🛠️ Conversión profunda para evitar choques entre Hash de Strings y Símbolos
        payload = params.to_unsafe_h.deep_symbolize_keys
        
        PersistenceOrchestrator.save_raw_offer(payload)
        render json: { status: 'SUCCESS', message: 'Oferta persistida en Postgres' }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: 'ERROR', message: e.message }, status: :unprocessable_entity
      rescue StandardError => e
        Rails.logger.error("🚨 [Create API] Fallo crítico al guardar: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo interno del servidor' }, status: :internal_server_error
      end

      private

      # =========================================================
      # 🎛️ SERIALIZADOR DTO (Postgres -> TypeScript)
      # =========================================================
      def serialize_laptop(laptop)
        # 🚀 Se usa la relación optimizada :latest_price sin golpear la memoria RAM
        latest_price = laptop.latest_price
        meta = laptop.metadata_extra || {}

        current_price  = latest_price&.precio_actual.to_f
        original_price = latest_price&.precio_original.to_f
        exchange_rate  = latest_price&.tipo_cambio_aplicado.to_f
        deal_score     = laptop.deal_score.to_f

        # 💱 Descuento calculado en el backend (única fuente de verdad)
        discount_pct =
          if original_price > current_price && original_price > 0
            (((original_price - current_price) / original_price) * 100).round
          else
            0
          end

        {
          id: laptop.id,
          slug: laptop.slug,
          country_code: laptop.country_code,
          currency: latest_price&.moneda || 'USD',
          brand: laptop.marca,
          name: laptop.modelo,
          condition: meta['condition'] || 'new',

          hardware: {
            cpu: laptop.procesador,
            ram_gb: laptop.ram_gb,
            storage_gb: laptop.disco_gb,
            gpu: laptop.tarjeta_video,
            display_inches: laptop.display_inches.to_f
          },

          financials: {
            original_price: original_price,
            current_price: current_price,
            discount_pct: discount_pct,
            # 🚀 FIX divisas: el tipo de cambio aplicado ahora viaja al frontend
            applied_exchange_rate: exchange_rate.positive? ? exchange_rate : nil,
            in_stock: true
          },

          intelligence: {
            deal_score: deal_score,
            ai_score_label: ai_score_label_for(deal_score),
            ai_reasoning: laptop.ai_reasoning,
            price_trend: price_trend_for(current_price, original_price),
            category: meta['category'] || 'business',
            is_featured_deal: latest_price&.es_oferta_destacada || deal_score >= 8.5,
            ai_badge: meta['ai_badge'],
            ui_accent_color: meta['ui_accent_color']
          },

          seo: {
            title: meta['seo_title'],
            description: meta['seo_description']
          },

          urls: {
            image: laptop.image_url,
            affiliate_raw: laptop.url_afiliado
          },

          metadata_extra: meta.merge({
            retailer: laptop.retailer&.slug
          })
        }
      end

      # 🏷️ Etiqueta semántica derivada del score (escala estricta 1.0 - 10.0)
      def ai_score_label_for(score)
        return 'ÓPTIMO'  if score >= 9.0
        return 'BUENO'   if score >= 7.5
        return 'REGULAR' if score >= 6.0
        'BAJO'
      end

      # 📈 Tendencia inferida de la relación precio actual vs original
      def price_trend_for(current_price, original_price)
        return 'stable' if original_price.zero? || current_price == original_price
        current_price < original_price ? 'down' : 'up'
      end

    end
  end
end
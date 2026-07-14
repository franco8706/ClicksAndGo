module Api
  module V1
    # 🔔 Despacho de alertas de precio (system-level, consumido por el
    #    PriceAlertAgent de Python). Zero-Trust: Rails es el único que toca
    #    Postgres; Python solo consume estos endpoints REST, protegidos por
    #    INTERNAL_API_KEY (Rails corre con ingress: all en Cloud Run).
    class AlertDispatchController < ApplicationController
      include InternalApiAuth

      # =========================================================
      # 🔎 GET /api/v1/price_alerts/pending
      # Devuelve las alertas ACTIVAS cuyo precio actual ya cayó <= target
      # y todavía no fueron notificadas. Trae el email del usuario y los
      # datos del producto listos para armar el email (sin exponer la DB).
      # =========================================================
      def pending
        scope = PriceAlert.where(is_active: true)
        # `notified_at` puede no existir aún si no se corrió migration_alerts_v4.sql.
        scope = scope.where(notified_at: nil) if has_notified_at?

        # includes evita N+1 al leer user, laptop y su último precio.
        triggered = scope.includes(:user, laptop: :latest_price).select do |alert|
          price = alert.laptop&.latest_price&.precio_actual
          price.present? && price.to_f <= alert.target_price.to_f
        end

        render json: triggered.map { |a| serialize_pending(a) }, status: :ok
      rescue StandardError => e
        Rails.logger.error("🚨 [AlertDispatch#pending] #{e.message}")
        render json: [], status: :ok
      end

      # =========================================================
      # ✅ POST /api/v1/price_alerts/mark_notified { ids: [uuid, ...] }
      # Marca como notificadas las alertas cuyo email se envió con éxito.
      # =========================================================
      def mark_notified
        ids = Array(params[:ids]).map(&:to_s).reject(&:blank?)
        count = 0
        if has_notified_at? && ids.any?
          count = PriceAlert.where(id: ids).update_all(notified_at: Time.current)
        end
        render json: { status: "SUCCESS", marked: count }, status: :ok
      rescue StandardError => e
        Rails.logger.error("🚨 [AlertDispatch#mark_notified] #{e.message}")
        render json: { status: "ERROR", message: "No se pudieron marcar las alertas" }, status: :internal_server_error
      end

      private

      def has_notified_at?
        PriceAlert.column_names.include?("notified_at")
      end

      def serialize_pending(alert)
        laptop = alert.laptop
        price  = laptop&.latest_price
        {
          id: alert.id,
          email: alert.user&.email,
          name: alert.user&.name,
          target_price: alert.target_price.to_f,
          current_price: price&.precio_actual.to_f,
          moneda: alert.moneda,
          brand: laptop&.marca,
          model: laptop&.modelo,
          slug: laptop&.slug,
          country_code: laptop&.country_code
        }
      end
    end
  end
end

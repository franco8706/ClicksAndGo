module Api
  module V1
    class PriceAlertsController < ApplicationController
      include InternalApiAuth

      # =========================================================
      # 🔔 GET /api/v1/users/:user_id/price_alerts
      # =========================================================
      def index
        alerts = PriceAlert
                 .where(user_id: params[:user_id], is_active: true)
                 .includes(laptop: :latest_price)
                 .order(created_at: :desc)
                 .limit(50)

        render json: alerts.map { |a| serialize_alert(a) }, status: :ok
      end

      # =========================================================
      # ➕ POST /api/v1/users/:user_id/price_alerts { laptop_id, target_price, moneda }
      # =========================================================
      def create
        alert = PriceAlert.create!(
          user_id: params[:user_id],
          laptop_id: alert_params[:laptop_id],
          target_price: alert_params[:target_price],
          moneda: alert_params[:moneda].presence || "USD"
        )
        render json: { status: "SUCCESS", id: alert.id }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      # =========================================================
      # 🗑️ DELETE /api/v1/users/:user_id/price_alerts/:id
      # =========================================================
      def destroy
        PriceAlert.where(user_id: params[:user_id], id: params[:id]).destroy_all
        render json: { status: "SUCCESS" }, status: :ok
      end

      private

      def alert_params
        params.permit(:laptop_id, :target_price, :moneda)
      end

      def serialize_alert(alert)
        laptop = alert.laptop
        {
          id: alert.id,
          target_price: alert.target_price,
          moneda: alert.moneda,
          laptop_id: laptop.id,
          slug: laptop.slug,
          marca: laptop.marca,
          modelo: laptop.modelo,
          precio_actual: laptop.latest_price&.precio_actual
        }
      end
    end
  end
end

module Api
  module V1
    class UsersController < ApplicationController
      include InternalApiAuth

      # =========================================================
      # 👤 GET /api/v1/users/:user_id/profile
      # =========================================================
      def show_profile
        user = User.find_by(id: params[:user_id])
        return render json: { status: "ERROR" }, status: :not_found unless user

        render json: serialize_profile(user), status: :ok
      end

      # =========================================================
      # ✏️ PATCH /api/v1/users/:user_id/profile
      # =========================================================
      def update_profile
        user = User.find_by(id: params[:user_id])
        return render json: { status: "ERROR" }, status: :not_found unless user

        user.assign_attributes(profile_params)
        user.save!
        render json: serialize_profile(user), status: :ok
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      # =========================================================
      # 🌍 PATCH /api/v1/users/:user_id/geo
      # Registra el país detectado por IP y la última visita — alimenta
      # segmentación regional sin persistir la IP cruda del visitante.
      # =========================================================
      def update_geo
        user = User.find_by(id: params[:user_id])
        return render json: { status: "ERROR" }, status: :not_found unless user

        user.update(
          detected_country: params[:detected_country],
          preferred_locale: params[:preferred_locale].presence,
          last_seen_at: Time.current
        )
        render json: { status: "SUCCESS" }, status: :ok
      end

      private

      def profile_params
        params.permit(:name, :last_name, :phone, :city, :country_code)
              .to_h.transform_values(&:presence)
      end

      def serialize_profile(user)
        {
          id: user.id,
          name: user.name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          image: user.image,
          created_at: user.created_at,
          country_code: user.country_code,
          detected_country: user.detected_country
        }
      end
    end
  end
end

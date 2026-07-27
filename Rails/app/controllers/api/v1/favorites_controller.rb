module Api
  module V1
    class FavoritesController < ApplicationController
      include InternalApiAuth

      # =========================================================
      # 💛 GET /api/v1/users/:user_id/favorites
      # ?ids_only=true → solo array de laptop_id (liviano, para la home)
      # =========================================================
      def index
        scope = UserFavorite.where(user_id: params[:user_id])

        if ActiveModel::Type::Boolean.new.cast(params[:ids_only])
          return render json: scope.pluck(:laptop_id), status: :ok
        end

        # 🚀 Evita N+1: precarga laptop + su último precio en 2 queries extra
        favorites = scope.includes(laptop: :latest_price).order(added_at: :desc).limit(50)
        render json: favorites.map { |f| serialize_favorite(f) }, status: :ok
      end

      # =========================================================
      # ➕ POST /api/v1/users/:user_id/favorites  { laptop_id }
      # =========================================================
      def create
        UserFavorite.find_or_create_by!(user_id: params[:user_id], laptop_id: favorite_params[:laptop_id])
        render json: { status: "SUCCESS" }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      # =========================================================
      # 🔁 POST /api/v1/users/:user_id/favorites/toggle  { laptop_id }
      # Usado desde el catálogo (corazón) — un solo round-trip.
      # =========================================================
      def toggle
        existing = UserFavorite.find_by(user_id: params[:user_id], laptop_id: favorite_params[:laptop_id])
        if existing
          existing.destroy
          render json: { status: "SUCCESS", favorite: false }, status: :ok
        else
          UserFavorite.create!(user_id: params[:user_id], laptop_id: favorite_params[:laptop_id])
          render json: { status: "SUCCESS", favorite: true }, status: :created
        end
      end

      # =========================================================
      # 🗑️ DELETE /api/v1/users/:user_id/favorites/:laptop_id
      # =========================================================
      def destroy
        UserFavorite.where(user_id: params[:user_id], laptop_id: params[:laptop_id]).destroy_all
        render json: { status: "SUCCESS" }, status: :ok
      end

      private

      def favorite_params
        params.permit(:laptop_id)
      end

      def serialize_favorite(fav)
        laptop = fav.laptop
        latest = laptop.latest_price
        {
          laptop_id: laptop.id,
          slug: laptop.slug,
          marca: laptop.marca,
          modelo: laptop.modelo,
          image_url: laptop.real_image_url,
          country_code: laptop.country_code,
          deal_score: laptop.deal_score,
          added_at: fav.added_at,
          precio_actual: latest&.precio_actual,
          moneda: latest&.moneda
        }
      end
    end
  end
end

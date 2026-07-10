module InternalApiAuth
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_internal_service!
  end

  private

  # 🛡️ Estos endpoints exponen datos de un usuario específico por su UUID
  # (perfil, favoritos, alertas de precio). Cloud Run expone Rails con
  # `ingress: all` — sin este chequeo, cualquiera en internet podría llamar
  # `/api/v1/users/:user_id/favorites` con un UUID ajeno y leer/escribir los
  # datos de otra persona (IDOR). El único llamador legítimo es Next.js desde
  # el servidor (nunca desde el navegador), que adjunta esta clave compartida.
  def authenticate_internal_service!
    expected = ENV["INTERNAL_API_KEY"].to_s
    provided = request.headers["X-Internal-Key"].to_s

    if expected.blank? || provided.blank? || !ActiveSupport::SecurityUtils.secure_compare(provided, expected)
      render json: { status: "ERROR", message: "No autorizado" }, status: :unauthorized
    end
  end
end

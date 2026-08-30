# Sesión de NextAuth (`strategy: "database"`).
#
# ⚠️ `session_token` es una CREDENCIAL portadora: quien la tiene, es el
# usuario. Por eso nunca viaja en una URL —ni siquiera como query param—,
# porque terminaría en los logs de acceso de Cloud Run. El controlador la
# recibe siempre en el cuerpo del request.
class Session < ApplicationRecord
  self.primary_key = "id"

  belongs_to :user

  validates :session_token, presence: true, uniqueness: true
  validates :expires, presence: true

  # Una sesión vencida es tan inválida como una inexistente.
  scope :vigentes, -> { where("expires > ?", Time.current) }
end

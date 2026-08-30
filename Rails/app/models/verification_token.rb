# Token de un magic link de email.
#
# ⚠️ También es una credencial: quien lo tiene puede iniciar sesión como el
# `identifier`. Mismo criterio que `Session` — nunca en una URL.
#
# La tabla tiene clave primaria COMPUESTA (identifier, token) y ninguna
# columna `id`, así que se le indica a ActiveRecord que no busque una.
class VerificationToken < ApplicationRecord
  self.primary_key = nil

  validates :identifier, :token, :expires, presence: true
end

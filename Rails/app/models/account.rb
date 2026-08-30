# Cuenta OAuth vinculada a un usuario (Google / Facebook / Microsoft).
#
# Espeja la tabla que NextAuth espera. La escritura la hace el adapter de
# Next.js a través de `Api::V1::AuthController`: Rails es el único dueño de
# Postgres, y estas filas no son la excepción.
class Account < ApplicationRecord
  self.primary_key = "id"

  # ⚠️ `type` es una columna RESERVADA en Rails: activa la herencia de tabla
  # única (STI) e intenta instanciar una clase con el valor de la columna. Como
  # NextAuth guarda ahí "oauth"/"email", Rails buscaba una clase `oauth` y
  # reventaba con 500 al vincular una cuenta. Desactivar STI le devuelve a la
  # columna su significado literal, que es el que espera NextAuth.
  self.inheritance_column = nil

  belongs_to :user

  validates :type, :provider, :provider_account_id, presence: true
  validates :provider_account_id, uniqueness: { scope: :provider }
end

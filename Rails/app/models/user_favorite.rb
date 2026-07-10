class UserFavorite < ApplicationRecord
  # 🗝️ Tabla sin columna `id`: PK compuesta (user_id, laptop_id) — soportado
  # nativamente desde Rails 7.1. Necesario para que `create!`/`destroy` sepan
  # qué columnas identifican la fila (si no, ActiveRecord asume `id`).
  self.primary_key = [:user_id, :laptop_id]

  belongs_to :user
  belongs_to :laptop
end

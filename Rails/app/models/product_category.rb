# 📂 Taxonomía del catálogo — tabla lookup con FK desde `laptops.product_type`.
#
# Dos niveles en una sola tabla:
#   · `code`   — la SUBCATEGORÍA, el tipo concreto (ssd, ram, routers, laptop…)
#   · `family` — la CATEGORÍA macro para la navegación (storage, components…)
#
# Es intencional que no haya tabla de familias: son 9 valores que cambian una
# vez por año, y una tabla aparte agregaría un JOIN a la ruta más caliente del
# sitio a cambio de nada. Las etiquetas de familia viven en el controller
# (`FAMILY_LABELS`) porque son presentación, no dato.
#
# La lista canónica se genera desde `Python/src/agents/taxonomy.py` hacia
# `Infra/db/migration_taxonomy_v8.sql`. No se edita a mano en ningún lado.
class ProductCategory < ApplicationRecord
  self.primary_key = :code

  has_many :laptops, foreign_key: :product_type, primary_key: :code,
                     inverse_of: false, dependent: :restrict_with_exception

  validates :code,   presence: true, uniqueness: true
  validates :family, presence: true
  validates :label,  presence: true

  scope :activas,      -> { where(active: true) }
  scope :de_familia,   ->(f) { where(family: f.to_s.downcase) }

  # Códigos de una familia. Se usa como subconsulta en el filtro por
  # categoría, así Postgres resuelve el semi-join sin traer las filas a Ruby.
  def self.codes_for_family(family)
    de_familia(family).select(:code)
  end
end

class Laptop < ApplicationRecord
  # 🔗 Relaciones
  belongs_to :retailer
  has_many :price_histories, dependent: :destroy

  # 🚀 OPTIMIZACIÓN EXTREMA DE RAM (Evita colapso por historial largo):
  # Delegamos la búsqueda del precio más reciente directo a PostgreSQL con un JOIN indexado.
  has_one :latest_price, -> { order(recorded_at: :desc) }, class_name: 'PriceHistory'

  # 🛡️ Validaciones Zero-Trust
  validates :sku_original, presence: true, uniqueness: { scope: :retailer_id }
  validates :slug, presence: true, uniqueness: true
  validates :marca, presence: true
  validates :modelo, presence: true
  validates :country_code, presence: true, length: { is: 2 }

  # 🧹 Filtros
  before_validation :normalize_data

  # 🧠 Helpers y Scopes (Consultas rápidas indexadas para Next.js)
  scope :ofertas_destacadas, -> { where("deal_score >= ?", 8.5) }
  scope :por_pais, ->(codigo) { where(country_code: codigo.to_s.upcase) }
  # 📦 Multi-producto: filtro por tipo (laptop|monitor|keyboard|...).
  scope :por_tipo, ->(tipo) { where(product_type: tipo.to_s.downcase) }

  private

  def normalize_data
    self.country_code = country_code.to_s.upcase.strip
    self.slug = slug.to_s.downcase.strip
    self.marca = marca.to_s.strip
    # 📦 Normaliza el discriminador de producto si la columna ya existe (migración v3).
    if has_attribute?(:product_type)
      self.product_type = product_type.to_s.downcase.strip.presence || 'laptop'
    end
  end
end
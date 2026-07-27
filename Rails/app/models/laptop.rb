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

  # 🖼️ Bancos de imágenes genéricos: una foto de acá NUNCA es el producto.
  STOCK_IMAGE_HOSTS = %w[
    images.unsplash.com unsplash.com placehold.co via.placeholder.com
    placekitten.com dummyimage.com loremflickr.com picsum.photos
  ].freeze

  # 🖼️ URL de la foto REAL del producto, o nil.
  #
  # Única fuente de verdad para "¿esta imagen se puede mostrar?". El API
  # nunca emite una foto decorativa: si no es la del producto, el frontend
  # dibuja el ícono neutro de la categoría (ProductImage.tsx). Mostrar la
  # imagen de otro artículo como si fuera el listado es una representación
  # engañosa — FTC §5, Directiva 2005/29/CE y Ley 24.240 art. 4.
  #
  # Tercera capa de la misma guarda: la ingesta la aplica antes de guardar
  # (`_clean_image_url` en data_normalizer.py) y Postgres la impone con
  # `chk_laptops_no_stock_image` (migration_real_images_v6.sql). Acá se
  # protege además el dato heredado que ya estuviera en la tabla.
  def real_image_url
    url = image_url.to_s.strip
    return nil unless url.start_with?('https://')

    host = begin
      URI.parse(url).host.to_s.downcase
    rescue URI::InvalidURIError
      return nil
    end
    return nil if host.blank?
    return nil if STOCK_IMAGE_HOSTS.any? { |s| host == s || host.end_with?(".#{s}") }

    url
  end

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
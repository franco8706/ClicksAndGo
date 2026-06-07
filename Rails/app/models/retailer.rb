class Retailer < ApplicationRecord
  # 🔗 Relaciones
  has_many :laptops, dependent: :restrict_with_error

  # 🛡️ Validaciones Zero-Trust flexibles para ingesta masiva
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: { scope: :country_code }
  validates :country_code, presence: true, length: { is: 2 }

  # 🧹 Filtros de Limpieza (Auto-Escalado)
  before_validation :normalize_and_fallback

  private

  def normalize_and_fallback
    # Forzar estándares estrictos de strings para evitar duplicados por tipeo
    self.slug = slug.to_s.downcase.strip
    self.country_code = country_code.to_s.upcase.strip
    
    # Auto-generar URL si el scraper no la envió (Permite registrar Amazon, BestBuy, etc. sin crashear)
    self.base_url = "https://#{self.slug.gsub('_', '')}.com" if self.base_url.blank?
  end
end
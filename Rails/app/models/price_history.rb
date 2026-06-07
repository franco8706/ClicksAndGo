class PriceHistory < ApplicationRecord
  # 🔗 Relaciones
  belongs_to :laptop

  # 🛡️ Validaciones
  validates :precio_actual, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :moneda, presence: true, length: { is: 3 }

  # 🧹 Filtros
  before_validation :normalize_financials

  private

  def normalize_financials
    self.moneda = moneda.to_s.upcase.strip
    
    # Garantizar que haya una marca de tiempo exacta para el ordenamiento
    self.recorded_at ||= Time.current
  end
end
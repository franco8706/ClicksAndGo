class HardwareNews < ApplicationRecord
  # 🛡️ Validaciones
  validates :title, presence: true, uniqueness: true
  validates :summary, presence: true
  validates :category, presence: true

  # Enum mapeado directamente al TYPE impact_level de PostgreSQL
  enum impact_score: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
  }

  # 🧹 Filtros
  before_validation :ensure_recorded_at

  private

  def ensure_recorded_at
    # Default seguro para que el Frontend siempre pueda ordenar las noticias
    self.recorded_at ||= Time.current
  end
end
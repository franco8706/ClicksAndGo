class User < ApplicationRecord
  # 🔗 Relaciones — Rails pasa a ser el único lector/escritor de datos de
  # usuario (perfil, favoritos, alertas). NextAuth (Next.js) sigue siendo
  # dueño exclusivo de accounts/sessions/verification_tokens (identidad y
  # login), pero los datos de negocio del usuario logueado viven acá.
  has_many :user_favorites, dependent: :destroy
  has_many :favorite_laptops, through: :user_favorites, source: :laptop
  has_many :price_alerts, dependent: :destroy

  SUPPORTED_COUNTRIES = %w[AR US ES MX BR CO CL].freeze

  validates :email, presence: true, uniqueness: true
  validates :country_code, inclusion: { in: SUPPORTED_COUNTRIES }, allow_nil: true

  before_validation :normalize_geo

  private

  def normalize_geo
    self.country_code = country_code.presence&.upcase&.strip
    self.detected_country = detected_country.presence&.upcase&.strip
  end
end

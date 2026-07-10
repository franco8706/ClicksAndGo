class PriceAlert < ApplicationRecord
  belongs_to :user
  belongs_to :laptop

  VALID_CURRENCIES = %w[USD ARS EUR MXN COP CLP BRL].freeze

  validates :target_price, presence: true, numericality: { greater_than: 0 }
  validates :moneda, presence: true, inclusion: { in: VALID_CURRENCIES }

  before_validation :normalize_moneda

  private

  def normalize_moneda
    self.moneda = moneda.to_s.upcase.strip if moneda.present?
  end
end

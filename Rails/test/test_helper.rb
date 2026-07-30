# =========================================================
# 🧪 ARNÉS DE TEST — Rails
#
# Uso:
#   cd Rails
#   POSTGRES_HOST=127.0.0.1 bin/test          # toda la suite
#   POSTGRES_HOST=127.0.0.1 bin/test test/models/laptop_test.rb
#
# 🛡️ GUARDA DE SEGURIDAD: aborta si la conexión no apunta a una base cuyo
# nombre termina en `_test`. El `database.yml` de este proyecto tiene la URL
# de Cloud SQL en el entorno production, así que un `RAILS_ENV` mal seteado
# podría correr `DELETE FROM` sobre la base real. La verificación de abajo
# hace imposible ese accidente.
# =========================================================

ENV["RAILS_ENV"] = "test"

require_relative "../config/environment"
require "rails/test_help"

db_name = ActiveRecord::Base.connection_db_config.database.to_s
unless db_name.end_with?("_test")
  abort <<~MSG
    🚨 ABORTADO: la suite apunta a la base "#{db_name}", que no termina en "_test".
       Los tests truncan tablas — negarse es la única opción segura.
       Revisá RAILS_ENV / DATABASE_URL / POSTGRES_DB antes de reintentar.
  MSG
end

module ActiveSupport
  class TestCase
    # El esquema se carga con los .sql de Infra/db (no hay schema.rb), así que
    # los tests limpian por truncado en vez de depender de `maintain_test_schema`.
    self.use_transactional_tests = true

    # ── Fábricas mínimas ────────────────────────────────────────────────────
    # Sin FactoryBot a propósito: una dependencia menos y el payload explícito
    # documenta el contrato real que Python le manda a Rails.

    def create_retailer(slug: "test_us", country: "US")
      Retailer.create!(
        name: "Test Retailer #{slug}",
        slug: slug,
        base_url: "https://example.test/",
        affiliate_tag: "tag-#{slug}",
        country_code: country
      )
    end

    def create_laptop(retailer: nil, sku: nil, image_url: nil, **attrs)
      retailer ||= create_retailer(slug: "r#{SecureRandom.hex(4)}")
      sku ||= "SKU-#{SecureRandom.hex(4)}"
      Laptop.create!(
        {
          retailer: retailer,
          sku_original: sku,
          slug: "producto-#{SecureRandom.hex(4)}",
          marca: "TestBrand",
          modelo: "Modelo X",
          country_code: "US",
          url_afiliado: "https://example.test/dp/X?tag=t",
          image_url: image_url,
          deal_score: 8.0
        }.merge(attrs)
      )
    end

    # Payload con la forma EXACTA que produce `data_normalizer.py`. Si el
    # contrato Python→Rails cambia, los tests que lo usan fallan.
    def normalized_offer(sku: "SKU-1", price: 999.0, original: 1299.0, image: nil, slug: nil)
      {
        sku_original: sku,
        retailer_slug: "test_us",
        country_code: "US",
        currency: "USD",
        brand: "TestBrand",
        name: "Modelo X",
        condition: "new",
        product_type: "laptop",
        specs: { cpu: "i7" },
        slug: slug,
        hardware: { cpu: "i7", gpu: "RTX", ram_gb: 16, storage_gb: 512, display_inches: 15.6 },
        financials: {
          original_price: original,
          current_price: price,
          discount_pct: 0,
          applied_exchange_rate: 1.0,
          in_stock: true
        },
        intelligence: { deal_score: 8.5, ai_reasoning: "Buena relación precio-calidad" },
        seo: { title: "T", description: "D" },
        urls: { image: image, affiliate_raw: "https://example.test/dp/X?tag=t" },
        metadata_extra: { category: "gaming" }
      }
    end
  end
end

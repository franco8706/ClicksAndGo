require "test_helper"

# =========================================================
# 🗄️ Tests del orquestador de persistencia — la frontera Python→Postgres.
#
# Cubre las tres invariantes que ya se rompieron o estuvieron a punto:
#   1. El slug NO se regenera en cada upsert (rompía los permalinks).
#   2. No se duplica el historial cuando el precio no cambió.
#   3. Sin foto real, `image_url` va NULL — no cadena vacía (lo exige el CHECK).
# =========================================================
class PersistenceOrchestratorTest < ActiveSupport::TestCase
  setup { @retailer = create_retailer(slug: "test_us") }

  # ── Upsert idempotente y permalinks estables ────────────────────────────

  test "guarda una oferta nueva" do
    assert_difference "Laptop.count", 1 do
      PersistenceOrchestrator.save_raw_offer(normalized_offer)
    end
  end

  test "reprocesar el mismo sku actualiza en vez de duplicar" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-A"))
    assert_no_difference "Laptop.count" do
      PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-A", price: 888.0))
    end
  end

  test "el slug se preserva entre upserts (permalinks estables)" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-B", slug: "mi-slug-original"))
    slug_inicial = Laptop.find_by(sku_original: "SKU-B").slug

    # Segunda ingesta SIN slug: no debe regenerarlo.
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-B", price: 777.0))

    assert_equal slug_inicial, Laptop.find_by(sku_original: "SKU-B").slug,
                 "regenerar el slug rompe /laptop/[slug] y la caché por slug"
  end

  # ── Historial de precios: sin duplicados ────────────────────────────────

  test "registra el precio la primera vez" do
    assert_difference "PriceHistory.count", 1 do
      PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-C", price: 100.0))
    end
  end

  test "NO duplica el historial si el precio no cambio" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-D", price: 100.0))
    assert_no_difference "PriceHistory.count" do
      PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-D", price: 100.0))
    end
  end

  test "registra un punto nuevo cuando el precio SI cambio" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-E", price: 100.0))
    assert_difference "PriceHistory.count", 1 do
      PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-E", price: 90.0))
    end
  end

  test "lee el ultimo precio bajo bloqueo de fila" do
    # Regresión del race condition: `latest_price` se leía de la asociación
    # cacheada por el find_or_initialize_by, así que el lock no servía de nada.
    # Con la consulta explícita, el segundo upsert ve el precio recién escrito.
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-F", price: 100.0))
    laptop = Laptop.find_by(sku_original: "SKU-F")

    assert_equal 1, PriceHistory.where(laptop_id: laptop.id).count
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-F", price: 100.0))
    assert_equal 1, PriceHistory.where(laptop_id: laptop.id).count,
                 "el segundo upsert no vio el precio ya escrito → historial duplicado"
  end

  # ── Política de imágenes reales ─────────────────────────────────────────

  test "sin imagen guarda NULL, no cadena vacia" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-G", image: nil))
    assert_nil Laptop.find_by(sku_original: "SKU-G").image_url
  end

  test "una cadena vacia se normaliza a NULL" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-H", image: ""))
    assert_nil Laptop.find_by(sku_original: "SKU-H").image_url
  end

  test "una imagen real https se guarda" do
    url = "https://m.media-amazon.com/images/I/71abc.jpg"
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-I", image: url))
    assert_equal url, Laptop.find_by(sku_original: "SKU-I").image_url
  end

  test "el CHECK de Postgres rechaza una foto de stock aunque se cuele hasta aca" do
    # Cuarta capa de la guarda: si la ingesta de Python fallara, el motor frena.
    assert_raises(ActiveRecord::StatementInvalid) do
      create_laptop(image_url: "https://images.unsplash.com/photo-1.jpg")
    end
  end

  test "el CHECK de Postgres rechaza http:// (contenido mixto)" do
    assert_raises(ActiveRecord::StatementInvalid) do
      create_laptop(image_url: "http://m.media-amazon.com/x.jpg")
    end
  end

  # ── Saneamiento de deal_score ───────────────────────────────────────────

  test "un deal_score en escala 0-100 se reescala a 1-10" do
    offer = normalized_offer(sku: "SKU-J")
    offer[:intelligence][:deal_score] = 85.0
    PersistenceOrchestrator.save_raw_offer(offer)
    assert_equal 8.5, Laptop.find_by(sku_original: "SKU-J").deal_score.to_f
  end

  test "un deal_score fuera de rango se recorta al maximo" do
    offer = normalized_offer(sku: "SKU-K")
    offer[:intelligence][:deal_score] = 9999.0
    PersistenceOrchestrator.save_raw_offer(offer)
    score = Laptop.find_by(sku_original: "SKU-K").deal_score.to_f
    assert_operator score, :<=, 10.0
    assert_operator score, :>=, 1.0
  end

  # ── El link de afiliado es la fuente de la comisión: nunca se pierde ────

  test "el link de afiliado se persiste intacto" do
    PersistenceOrchestrator.save_raw_offer(normalized_offer(sku: "SKU-L"))
    laptop = Laptop.find_by(sku_original: "SKU-L")
    assert_equal "https://example.test/dp/X?tag=t", laptop.url_afiliado
  end

  # ── Robustez ante payloads incompletos ──────────────────────────────────

  test "un payload sin campos obligatorios lanza en vez de guardar basura" do
    assert_raises(ActiveRecord::RecordInvalid) do
      PersistenceOrchestrator.save_raw_offer(
        normalized_offer(sku: "SKU-M").merge(brand: nil, name: nil, country_code: nil)
      )
    end
  end
end

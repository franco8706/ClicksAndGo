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

  # ── Alta de retailers nuevos ────────────────────────────────────────────
  #
  # Acá vive el riesgo real de "ir sumando afiliados": el retailer se crea solo,
  # con lo que venga en el feed. Postgres tiene DOS constraints únicas sobre
  # `retailers` — (slug, country) y (name, country) — y el alta solo controlaba
  # la primera.

  test "el retailer se nombra por la TIENDA, no por la marca del producto" do
    offer = normalized_offer(sku: "SKU-N").merge(retailer_slug: "lenovo_argentina", brand: "Lenovo")
    PersistenceOrchestrator.save_raw_offer(offer)

    retailer = Retailer.find_by(slug: "lenovo_argentina", country_code: "US")
    assert_equal "Lenovo Argentina", retailer.name,
                 "nombrarlo con `brand` hace que la tienda se llame como el primer producto que entró"
  end

  test "una tienda nueva entra aunque su marca ya nombre a otra del pais" do
    # Situación exacta de producción: `newegg`/US quedó con el nombre "Genérica"
    # (la marca de su primer producto). Cualquier alta posterior en US cuyo
    # primer producto no matchee marca conocida vuelve a proponer "Genérica" —
    # es el fallback de market_hunter.py — y choca con uq_retailer_name_country.
    #
    # El `rescue RecordNotUnique; retry` no llegaba a correr: Rails 7.1 atrapa
    # ese error DENTRO de `find_or_create_by!` y reintenta un `find_by!` por
    # slug+country, que no es donde chocó. Sale RecordNotFound → 422 → se
    # descarta el producto. Y como el nombre choca para TODOS los productos de
    # esa tienda, se pierde el afiliado completo, en silencio.
    Retailer.create!(
      name: "Genérica", slug: "newegg", country_code: "US",
      base_url: "https://newegg.com"
    )

    offer = normalized_offer(sku: "SKU-O").merge(retailer_slug: "bhphoto", brand: "Genérica")
    PersistenceOrchestrator.save_raw_offer(offer)

    nueva = Retailer.find_by(slug: "bhphoto", country_code: "US")
    assert_not_nil nueva, "la tienda nueva tiene que quedar creada"
    assert_not_equal "Genérica", nueva.name
    assert_equal 1, Laptop.where(retailer_id: nueva.id).count
  end

  test "dos altas simultaneas del mismo slug convergen en un solo retailer" do
    # El race real: el MasterOrchestrator postea con 5 workers concurrentes.
    # El SELECT no encuentra nada en ninguno de los dos hilos y ambos INSERTan.
    PersistenceOrchestrator.save_raw_offer(
      normalized_offer(sku: "SKU-P").merge(retailer_slug: "tienda_nueva")
    )
    PersistenceOrchestrator.save_raw_offer(
      normalized_offer(sku: "SKU-Q").merge(retailer_slug: "tienda_nueva")
    )

    assert_equal 1, Retailer.where(slug: "tienda_nueva", country_code: "US").count
  end

  # ── Noticias: un ítem malo no puede llevarse el lote ────────────────────
  #
  # `category` la escribe Gemini como texto libre ("tag descriptivo en
  # español") contra una columna varchar(50), y `title` viene crudo del RSS
  # contra varchar(255). El 2026-08-17 quedó en los logs de producción:
  # PG::StringDataRightTruncation — y como el lote entero iba en UNA
  # transacción, se perdieron las ~40 noticias del ciclo por una sola larga.

  def noticia(titulo:, categoria: "Hardware Global", pais: nil)
    { title: titulo, category: categoria, summary: "Resumen.",
      impact_score: "HIGH", recorded_at: Time.current, country_code: pais }
  end

  test "una categoria mas larga que la columna se recorta en vez de reventar" do
    larga = "Inteligencia Artificial y Computación de Alto Rendimiento en Portátiles"
    assert_operator larga.length, :>, 50, "el caso de prueba tiene que exceder varchar(50)"

    PersistenceOrchestrator.save_news_batch([noticia(titulo: "N1", categoria: larga)])

    assert_equal 50, HardwareNews.find_by(title: "N1").category.length
  end

  test "un titulo mas largo que la columna se recorta en vez de reventar" do
    largo = "T" * 400
    PersistenceOrchestrator.save_news_batch([noticia(titulo: largo)])

    assert_equal 1, HardwareNews.where("title LIKE 'TTT%'").count
    assert_equal 255, HardwareNews.where("title LIKE 'TTT%'").first.title.length
  end

  test "una noticia invalida NO se lleva puesto al resto del lote" do
    # Título vacío: no hay clave por la cual hacer upsert, así que se descarta
    # esa sola. Las otras dos tienen que quedar guardadas igual.
    lote = [
      noticia(titulo: "Buena 1"),
      noticia(titulo: ""),
      noticia(titulo: "Buena 2")
    ]

    assert_difference "HardwareNews.count", 2 do
      PersistenceOrchestrator.save_news_batch(lote)
    end
    assert HardwareNews.exists?(title: "Buena 2"),
           "la noticia posterior a la fallada tiene que sobrevivir"
  end

  test "el pais de la noticia se normaliza a dos letras en mayuscula" do
    PersistenceOrchestrator.save_news_batch([noticia(titulo: "N-BR", pais: "br")])
    assert_equal "BR", HardwareNews.find_by(title: "N-BR").country_code
  end

  test "el slug del retailer se normaliza (mayusculas y espacios del feed)" do
    # `merchantname`/`CampaignName` llegan crudos de la red de afiliados.
    offer = normalized_offer(sku: "SKU-R").merge(retailer_slug: "  Best Buy US  ")
    PersistenceOrchestrator.save_raw_offer(offer)

    assert_not_nil Retailer.find_by(slug: "best_buy_us", country_code: "US"),
                   "sin normalizar, 'Best Buy US' y 'best_buy_us' son dos tiendas distintas"
  end
end

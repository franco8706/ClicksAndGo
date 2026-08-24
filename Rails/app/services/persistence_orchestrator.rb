class PersistenceOrchestrator
  # 🛡️ Orquestador Transaccional Zero-Trust

  # Tokens que van en MAYÚSCULA al derivar el nombre visible de una tienda:
  # siglas de marca (hp, msi, lg) y códigos de país (us, ar, br). El corte por
  # longitud ≤ 3 los cubre a todos sin mantener una lista que se desactualice.
  RETAILER_SIGLA_MAX = 3

  # =========================================================
  # 🛒 PERSISTENCIA DE CATÁLOGO (Amazon, Lenovo, Mercadolibre...)
  # =========================================================
  def self.save_raw_offer(data)
    # 1. 🏪 Alta/-búsqueda de la TIENDA. Es la puerta por donde entra cada
    #    afiliado nuevo, así que no puede fallar por un choque de nombres.
    retailer = find_or_create_retailer!(
      raw_slug: data[:retailer_slug],
      raw_country: data[:country_code]
    )

    # 2. Extracción de nodos del JSON de Python
    hardware = data[:hardware] || {}
    financials = data[:financials] || {}
    intelligence = data[:intelligence] || {}
    urls = data[:urls] || {}

    # 3. Transacción ACID: Garantiza que Laptop e Historial se inserten juntos
    ActiveRecord::Base.transaction do
      
      # 🔄 UPSERT: Busca por SKU o inicializa uno nuevo
      laptop = Laptop.find_or_initialize_by(
        retailer_id: retailer.id, 
        sku_original: data[:sku_original] || "SKU-#{SecureRandom.hex(4)}"
      )

      # Mapeo de datos principales
      # 🛡️ El slug se asigna SOLO al crear (o si falta): regenerarlo en cada
      # upsert rompía los permalinks /laptop/[slug] y la caché por slug en
      # cada re-scrapeo (el hex aleatorio cambiaba el slug del mismo producto).
      if laptop.new_record? || laptop.slug.blank?
        laptop.slug = data[:slug] || "#{data[:brand].to_s.parameterize}-#{data[:name].to_s.parameterize}-#{SecureRandom.hex(3)}"
      end
      laptop.marca = data[:brand]
      laptop.modelo = data[:name]
      laptop.country_code = data[:country_code]

      # 📦 Multi-producto: tipo + specs genéricas (migración v3).
      # `has_attribute?` degrada con gracia si la columna aún no existe.
      if laptop.has_attribute?(:product_type)
        laptop.product_type = (data[:product_type].presence || 'laptop').to_s.downcase
      end
      if laptop.has_attribute?(:specs)
        laptop.specs = data[:specs] if data[:specs].present?
      end

      # Mapeo de Hardware (laptops/desktops; nil para otros tipos)
      laptop.procesador = hardware[:cpu]
      laptop.ram_gb = hardware[:ram_gb]
      laptop.disco_gb = hardware[:storage_gb]
      laptop.tarjeta_video = hardware[:gpu]
      laptop.display_inches = hardware[:display_inches]
      
      # Mapeo de Inteligencia y URLs
      # 🛡️ Normalización de escala: el contrato exige deal_score en rango 1.0 - 10.0.
      # Si por alguna fuente llega en escala 0-100, lo reescalamos de forma defensiva.
      raw_score = intelligence[:deal_score].to_f
      raw_score = (raw_score / 10.0).round(1) if raw_score > 10.0
      laptop.deal_score = raw_score.clamp(1.0, 10.0) if raw_score.positive?
      laptop.ai_reasoning = intelligence[:ai_reasoning]
      # 🖼️ Sin foto real → NULL (no cadena vacía): el CHECK
      # `chk_laptops_no_stock_image` exige https o NULL, y el frontend
      # distingue "no hay imagen" para dibujar el ícono de la categoría.
      laptop.image_url = urls[:image].to_s.strip.presence
      laptop.url_afiliado = urls[:affiliate_raw]

      # Metadatos extra y SEO (JSONB)
      laptop.metadata_extra = (data[:metadata_extra] || {}).merge({
        seo_title: data.dig(:seo, :title),
        seo_description: data.dig(:seo, :description),
        ui_accent_color: intelligence[:ui_accent_color],
        ai_badge: intelligence[:ai_badge],
        category: intelligence[:category] || data[:category],
        condition: data[:condition]
      }).compact

      laptop.save!

      # 📈 REGISTRO HISTÓRICO — con bloqueo de fila (pessimistic lock).
      #
      # ⚠️ Por qué el lock es obligatorio acá: el MasterOrchestrator postea con
      # `ThreadPoolExecutor(max_workers=5)`, o sea 5 requests concurrentes. Si
      # dos traen el MISMO sku (el mismo producto puede venir repetido en un
      # feed, o cubierto por dos fuentes), ambas transacciones leían
      # `latest_price` fuera de cualquier bloqueo, las dos veían el mismo
      # precio previo, y las dos insertaban en `price_histories` → historial
      # duplicado para el mismo instante. Eso envenena el futuro cálculo del
      # mínimo de 30 días que exige la Directiva Omnibus para poder mostrar
      # descuentos (ver redesign_plan.md), así que no es solo ruido.
      #
      # `lock!` hace `SELECT ... FOR UPDATE` sobre la fila de la laptop y
      # serializa a las escrituras concurrentes del mismo producto: la segunda
      # espera, ve el precio que insertó la primera y omite el duplicado.
      laptop.lock!

      # Consulta explícita en vez de `laptop.latest_price`: la asociación
      # `has_one` quedó cacheada por el `find_or_initialize_by` de arriba y
      # devolvería el valor pre-lock, anulando el propósito del bloqueo.
      last_price = PriceHistory.where(laptop_id: laptop.id).order(recorded_at: :desc).first

      if last_price.nil? || last_price.precio_actual != financials[:current_price].to_f
        PriceHistory.create!(
          laptop_id: laptop.id,
          precio_actual: financials[:current_price].to_f,
          precio_original: financials[:original_price].to_f,
          moneda: data[:currency] || 'USD',
          # 💱 FIX divisas: persistimos el tipo de cambio aplicado en la ingesta
          tipo_cambio_aplicado: financials[:applied_exchange_rate],
          es_oferta_destacada: laptop.deal_score.to_f >= 8.5
        )
        Rails.logger.info("✅ [Rails Guardian] Nuevo precio registrado para #{laptop.modelo}: #{financials[:current_price]}")
      else
        Rails.logger.info("⏭️ [Rails Guardian] Precio sin cambios para #{laptop.modelo}. Se omite historial.")
      end

    end # Fin de transacción

  rescue => e
    Rails.logger.error("🚨 [Persistence Error] Fallo al guardar oferta: #{e.message}")
    raise e # Re-lanzar para que el controlador responda con código de error 422
  end

  # =========================================================
  # 🏪 ALTA DE TIENDAS — la puerta de entrada de cada afiliado nuevo
  # =========================================================
  #
  # `retailers` tiene DOS constraints únicas en Postgres: (slug, country) y
  # (name, country). El alta anterior solo contemplaba la primera y nombraba
  # la tienda con `data[:brand]` — la marca del PRIMER producto que entrara.
  # De ahí salió que en producción `newegg`/US se llame "Genérica".
  #
  # El daño no era cosmético. "Genérica" es el fallback de marca de
  # market_hunter.py, así que toda tienda nueva de US cuyo primer producto no
  # matcheara una marca conocida proponía ese mismo nombre y chocaba con la
  # constraint. Y el `rescue RecordNotUnique; retry` no llegaba a correr:
  # Rails 7.1 atrapa ese error dentro de `find_or_create_by!` y reintenta un
  # `find_by!` por slug+country — que no es donde chocó — así que sale
  # RecordNotFound, el controlador responde 422 y el producto se descarta.
  # Como el nombre choca para TODOS los productos de esa tienda, se perdía el
  # afiliado entero sin un solo error visible.
  #
  # Ahora el nombre se deriva del SLUG, que es la identidad real de la tienda,
  # y las colisiones se resuelven desambiguando con una lista FINITA de
  # candidatos. Nunca se reintenta a ciegas: colgarse con una conexión de
  # Postgres tomada es peor que fallar (la instancia tiene 25 en total).
  def self.find_or_create_retailer!(raw_slug:, raw_country:)
    country = raw_country.to_s.upcase.strip.presence || 'US'
    slug    = normalize_retailer_slug(raw_slug)

    # Caso mayoritario: la tienda ya existe y esto es un re-scrapeo.
    existing = Retailer.find_by(slug: slug, country_code: country)
    return existing if existing

    Retailer.create!(name: available_retailer_name(slug, country), slug: slug, country_code: country)
  rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
    # Carrera real: el MasterOrchestrator postea con 5 hilos y dos pueden
    # traer la primera oferta de la misma tienda. La fila que creó el que ganó
    # sirve igual. Un solo reintento — si tampoco está, el problema no es la
    # carrera y hay que verlo, no enmascararlo.
    Retailer.find_by(slug: slug, country_code: country) || raise(e)
  end

  # `merchantname` / `advertiser-name` / `CampaignName` llegan crudos de la red
  # de afiliados ("Best Buy US", "Lenovo  Argentina"). Sin normalizar, la misma
  # tienda entra dos veces con slugs distintos y el catálogo se fragmenta.
  def self.normalize_retailer_slug(raw)
    slug = raw.to_s.downcase.strip.gsub(/[^a-z0-9]+/, '_').gsub(/\A_+|_+\z/, '')
    slug.presence&.slice(0, 50) || 'generic'
  end

  # lenovo_argentina → "Lenovo Argentina"; best_buy_us → "Best Buy US".
  def self.retailer_display_name(slug)
    slug.split('_').reject(&:blank?).map { |token|
      token.length <= RETAILER_SIGLA_MAX ? token.upcase : token.capitalize
    }.join(' ').presence&.slice(0, 50) || 'Tienda'
  end

  # Primer nombre libre para el país. La lista es corta y termina: el sufijo
  # aleatorio garantiza salida sin depender de que el SELECT haya acertado.
  def self.available_retailer_name(slug, country)
    base = retailer_display_name(slug)
    [base, "#{base[0, 38]} (#{slug})"[0, 50]].find { |candidato|
      !Retailer.exists?(name: candidato, country_code: country)
    } || "#{base[0, 40]} #{SecureRandom.hex(3)}"[0, 50]
  end

  # =========================================================
  # 📰 PERSISTENCIA DE NOTICIAS DE HARDWARE (Radar IA)
  # =========================================================
  # Anchos reales de las columnas en Postgres. Recortar acá y no confiar en
  # que la fuente se porte bien: `category` la escribe Gemini como texto libre
  # ("tag descriptivo en español", ver news_radar.py) y `title` viene crudo del
  # RSS. Ninguna de las dos tiene un largo garantizado.
  NEWS_CATEGORY_MAX = 50
  NEWS_TITLE_MAX    = 255

  def self.save_news_batch(news_array)
    return unless news_array.is_a?(Array)

    # 🔒 UNA TRANSACCIÓN POR NOTICIA, no una por lote.
    #
    # El 2026-08-17 producción registró
    #   PG::StringDataRightTruncation: value too long for type character varying(50)
    # y como el lote entero iba en una sola transacción, ese error se llevó las
    # ~40 noticias del ciclo, no solo la larga. El ticker quedó con contenido
    # viejo hasta el ciclo siguiente sin que nada lo indicara en el sitio.
    #
    # Las noticias son independientes entre sí: no hay ninguna invariante que
    # exija guardarlas todas o ninguna. Aislarlas convierte "se perdió el
    # ciclo" en "se perdió una".
    guardadas = 0
    fallidas  = []

    news_array.each do |item|
      titulo = item[:title].to_s.strip[0, NEWS_TITLE_MAX]
      # Sin título no hay clave de upsert posible: se descarta esa sola.
      if titulo.blank?
        fallidas << 'noticia sin título'
        next
      end

      begin
        ActiveRecord::Base.transaction do
          # Patrón Upsert: si el título ya existe, lo actualiza (evita UNIQUE).
          news = HardwareNews.find_or_initialize_by(title: titulo)
          news.category = item[:category].to_s.strip.presence&.slice(0, NEWS_CATEGORY_MAX) || 'Global Tech'
          news.summary  = item[:summary].presence || 'Sin resumen disponible.'

          # Validación defensiva del Enum de PostgreSQL
          valid_scores = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
          impact = item[:impact_score].to_s.upcase
          news.impact_score = valid_scores.include?(impact) ? impact : 'MEDIUM'

          news.recorded_at = item[:recorded_at] || Time.current
          news.source_url  = item[:source_url] if item[:source_url].present?
          # 🌍 Geo: feed regional → visible solo en su país (NULL = global).
          # Defensivo con has_attribute? por entornos sin la columna.
          if news.has_attribute?(:country_code) && item[:country_code].present?
            news.country_code = item[:country_code].to_s.upcase[0, 2]
          end
          news.save!
        end
        guardadas += 1
      rescue => e
        # Se registra con el título para poder rastrear la fuente, y se sigue.
        fallidas << "#{titulo[0, 60]} → #{e.class}: #{e.message[0, 120]}"
      end
    end

    if fallidas.any?
      Rails.logger.error(
        "🚨 [Persistence] #{guardadas}/#{news_array.size} noticias guardadas. " \
        "Descartadas #{fallidas.size}: #{fallidas.join(' | ')}"
      )
    else
      Rails.logger.info("📰 [Persistence] #{guardadas} noticias guardadas.")
    end

    guardadas
  end
end
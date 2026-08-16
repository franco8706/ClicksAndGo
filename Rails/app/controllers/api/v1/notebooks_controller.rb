module Api
  module V1
    class NotebooksController < ApplicationController
      # 🛡️ Zero-Trust: Permite a los microservicios internos hacer POST sin token de formulario
      # skip_before_action :verify_authenticity_token, only: [:create, :create_news]

      # =====================================================================
      # 🔐 ESCRITURAS AUTENTICADAS (fix de vulnerabilidad, 2026-07-28)
      #
      # Rails corre con `ingress: all` en Cloud Run. Hasta este cambio, este
      # controller NO incluía InternalApiAuth y sus dos endpoints de escritura
      # quedaban abiertos a internet. Verificado explotable en producción:
      #   · POST /api/v1/notebooks           → 422 (pasó auth, solo falló la
      #     validación) ⇒ con un payload válido, cualquiera podía inyectar
      #     productos en el catálogo — incluidos SUS propios links de afiliado,
      #     desviando comisiones, o links de phishing con la marca del sitio.
      #   · POST /api/v1/notebooks/hardware_news → 201 SUCCESS ⇒ inyección
      #     directa de contenido al ticker del home, con `source_url` como
      #     enlace clickeable para todos los visitantes.
      #
      # Se protege SOLO la escritura: las lecturas (`index`, `hardware_news`,
      # `sitemap`) las consume el SSR de Next.js y el sitemap público, y deben
      # seguir siendo anónimas. El `include` aplica el before_action a TODAS
      # las acciones y después se exceptúan las de lectura — así una acción
      # nueva nace protegida por defecto (fail-safe), no expuesta.
      # =====================================================================
      include InternalApiAuth
      skip_before_action :authenticate_internal_service!,
                         only: %i[index hardware_news sitemap categories]

      # =========================================================
      # 💻 ENDPOINT: GET /api/v1/notebooks
      # =========================================================
      def index
        if params[:slug].present?
          result = Rails.cache.fetch("notebooks/slug/#{params[:slug]}", expires_in: 5.minutes) do
            Laptop.includes(:retailer, :latest_price)
                  .where(slug: params[:slug])
                  .limit(1)
                  .map { |l| serialize_laptop(l) }
          end
        else
          country = (params[:country].presence || 'US').upcase[0, 2]

          # 📄 PAGINACIÓN REAL (taxonomía v8).
          #
          # Antes solo existía `limit` clampeado a 100, o sea que el catálogo
          # era inalcanzable más allá de los primeros 100 productos de cada
          # país. Con el catálogo completo de un retailer (Newegg expone
          # ~693.000 items) eso deja el 99,98% del catálogo sin ninguna URL
          # que lo muestre.
          #
          # `per_page` sigue topado en 100: es lo que una página del sitio
          # puede renderizar sin castigar al navegador, y evita que un
          # request pida 50.000 productos y se lleve puesta la memoria del
          # contenedor (512 MiB, ver cloudrun-rails.yaml).
          per_page = (params[:per_page] || params[:limit] || 40).to_i.clamp(1, 100)
          page     = (params[:page] || 1).to_i.clamp(1, MAX_PAGE)

          # 📦 Filtros de la taxonomía de dos niveles:
          #    ?type=ssd            → subcategoría (product_type)
          #    ?category=storage    → categoría macro (product_categories.family)
          # `has_product_type?` degrada con gracia si aún no corrió la v3.
          type     = has_product_type? ? params[:type].presence : nil
          category = params[:category].presence

          # 🛡️ TODO parámetro que cambia el resultado va en la cache key: sin
          # eso un request con ?page=7 envenenaba el catálogo cacheado del
          # país entero. Es una regresión que ya ocurrió con `limit` y `type`.
          cache_key = "products/catalog/v8/#{country}/#{category || 'all'}/" \
                      "#{type || 'all'}/#{page}/#{per_page}"

          result = Rails.cache.fetch(cache_key, expires_in: 60.seconds) do
            catalog_scope(country, category, type)
              .offset((page - 1) * per_page)
              .limit(per_page)
              .map { |l| serialize_laptop(l) }
          end
        end

        render json: result, status: :ok
      end

      # =========================================================
      # 📂 ENDPOINT: GET /api/v1/products/categories
      #
      # Árbol de navegación con conteos reales, para que el menú del sitio no
      # ofrezca ramas vacías. Devuelve:
      #   [{ code: "storage", label: "Almacenamiento", total: 412,
      #      subcategories: [{ code: "ssd", label: "Discos SSD", total: 83 }] }]
      #
      # Se calcula con UN solo GROUP BY sobre el índice de cobertura
      # `idx_laptops_type_counts`, no con una query por rama: con 56
      # subcategorías × 7 países eso serían 392 queries por request.
      #
      # Cache de 5 minutos: el árbol cambia solo cuando la ingesta agrega un
      # tipo nuevo, no en cada request, y es lo que se pinta en TODAS las
      # páginas del sitio.
      # =========================================================
      def categories
        country = (params[:country].presence || 'US').upcase[0, 2]

        # `race_condition_ttl` evita la estampida al vencer el cache. Medido
        # con 500.000 productos, este GROUP BY tarda 130 ms; sin protección,
        # las 10 requests que entran en ese instante (2 workers × 5 threads,
        # ver cloudrun-rails.yaml) lo recalculan TODAS y el pico se multiplica
        # por 10 justo cuando hay tráfico. Con esto, la primera lo recalcula y
        # las demás siguen sirviendo el valor viejo unos segundos.
        result = Rails.cache.fetch("products/categories/v8/#{country}",
                                   expires_in: 5.minutes,
                                   race_condition_ttl: 10.seconds) do
          conteos = Laptop.where(country_code: country).group(:product_type).count
          build_category_tree(conteos)
        end

        render json: result, status: :ok
      rescue StandardError => e
        # El menú no puede tumbar la página: si falla, el sitio se sirve sin
        # navegación por categorías en vez de devolver un 500.
        Rails.logger.error("[categories] #{e.class}: #{e.message}")
        render json: [], status: :ok
      end

      # =========================================================
      # 🗺️ ENDPOINT: GET /api/v1/notebooks/sitemap
      #
      # Índice mínimo del catálogo para `Web/src/app/sitemap.ts`. Devuelve
      # SOLO `{slug, updated_at}` — no el DTO completo — porque el sitemap no
      # necesita precios ni specs y el payload liviano permite traer todo el
      # catálogo de una sin paginar.
      #
      # Por qué un endpoint propio y no reusar `index`:
      #   · `index` filtra por país (`country_code`) y el sitemap necesita el
      #     catálogo COMPLETO — un producto solo de AR debe indexarse igual.
      #   · `index` clampea `limit` a 100: con >100 productos por país el
      #     sitemap perdería filas EN SILENCIO, que es exactamente el modo de
      #     fallo inaceptable para SEO.
      #   · `updated_at` no está en el DTO público; acá se expone porque el
      #     `<lastmod>` tiene que ser real (mentirle a Google la fecha de
      #     modificación degrada el rate de rastreo).
      #
      # `pluck` va directo a SQL: sin instanciar ActiveRecord ni serializar.
      # =========================================================

      # Tope de seguridad. El protocolo sitemap permite 50.000 URLs por archivo
      # y cada producto emite 4 (uno por idioma) → 12.500 productos sería el
      # límite duro. Se corta antes, en 10.000, para dejar aire a las rutas
      # estáticas y al crecimiento. Si alguna vez se alcanza, la solución no es
      # subir este número sino partir en sitemap index (varios archivos) —
      # `generateSitemaps()` de Next lo soporta nativo.
      SITEMAP_MAX_PRODUCTS = 10_000

      # 📄 Tope de página. `OFFSET` en Postgres cuesta O(offset): pedir la
      # página 100.000 obliga a recorrer y descartar 4 millones de filas antes
      # de devolver 40. Se corta en 1.000 páginas (40.000 productos con el
      # per_page por defecto) — más profundo que eso nadie navega, y lo que
      # haría falta para ir más lejos no es subir este número sino paginar por
      # cursor (`WHERE id > ?`), que no degrada con la profundidad.
      MAX_PAGE = 1_000

      # 📂 Etiquetas de las 9 categorías macro. Viven acá y no en la DB porque
      # son de presentación: `product_categories.family` guarda el código
      # estable, y traducirlo es responsabilidad de quien lo muestra.
      FAMILY_LABELS = {
        'computing'   => 'Computadoras',
        'displays'    => 'Monitores y pantallas',
        'components'  => 'Componentes',
        'storage'     => 'Almacenamiento',
        'peripherals' => 'Periféricos',
        'networking'  => 'Redes',
        'printing'    => 'Impresión',
        'power'       => 'Energía y cables',
        'accessories' => 'Accesorios'
      }.freeze

      def sitemap
        result = Rails.cache.fetch('products/sitemap/v2', expires_in: 1.hour) do
          # `product_type` y `name` viajan para que la Web decida qué entra al
          # índice (`isIndexableProduct` en `src/lib/productSeo.ts`). Se podría
          # filtrar acá y ahorrar payload, pero entonces el criterio viviría en
          # Ruby y en TypeScript a la vez: es exactamente la divergencia que
          # escondió 2555 fotos el 2026-08-10 (denylist vs allowlist). Un solo
          # dueño del criterio, aunque cueste ~1,5 MB en una llamada interna
          # que además queda cacheada 1 h.
          # ⚠️ La columna es `modelo`, NO `name`: el DTO público la renombra
          # (`name: laptop.modelo` en el serializer) y es fácil olvidarlo acá,
          # donde se va a SQL directo. `pluck(:name)` lanza, el `rescue` de
          # abajo lo convierte en `[]` con 200 y el sitemap queda **vacío sin
          # avisar** — pasó exactamente así al escribir esto.
          Laptop.order(updated_at: :desc)
                .limit(SITEMAP_MAX_PRODUCTS)
                .pluck(:slug, :updated_at, :product_type, :modelo)
                .filter_map do |slug, updated_at, product_type, modelo|
                  next if slug.blank?
                  # Se emite como `name` para hablar el mismo idioma que el
                  # resto del DTO que consume la Web.
                  { slug: slug, updated_at: updated_at&.utc&.iso8601,
                    product_type: product_type, name: modelo }
                end
        end

        render json: result, status: :ok
      rescue StandardError => e
        # Igual que hardware_news: nunca 500 al consumidor. Un sitemap sin
        # productos es recuperable (Next cae a sus rutas estáticas); un 500
        # deja a Next sin respuesta y arriesga un sitemap.xml roto servido
        # a Google.
        Rails.logger.error("🚨 [Sitemap API] Fallo al listar el catálogo: #{e.message}")
        render json: [], status: :ok
      end

      # =========================================================
      # 📡 ENDPOINT: GET /api/v1/notebooks/hardware_news
      # =========================================================
      # 🌍 Grupo lingüístico de cada país: qué marcas de `country_code` acepta.
      #
      # `NewsRadar` guarda en `country_code` el REPRESENTANTE del idioma del
      # feed, no su nacionalidad ("ES" para todo el español, "BR" para el
      # portugués, "IT" para el italiano; los feeds en inglés van NULL como
      # global). Acá se expande el país del visitante a las marcas que le
      # sirven, porque lo que hace útil una noticia es que esté en su idioma:
      # a un argentino le sirve Xataka aunque sea un medio español.
      #
      # Antes la consulta comparaba `country_code = 'AR'` literal. Como ningún
      # feed estaba marcado "AR", un visitante argentino caía siempre en la
      # rama `IS NULL` y recibía 20 noticias en inglés. Medido el 2026-08-15:
      # AR, US, BR y ES devolvían el mismo titular.
      NEWS_LANG_PEERS = {
        'AR' => %w[AR ES], 'CL' => %w[CL ES], 'CO' => %w[CO ES],
        'MX' => %w[MX ES], 'ES' => %w[ES],
        'BR' => %w[BR], 'IT' => %w[IT], 'US' => %w[US]
      }.freeze

      NEWS_LIMIT = 20

      def hardware_news
        country_raw = params[:country].to_s.upcase[0, 2].presence || 'US'
        cache_key   = "hardware_news/v2/#{country_raw}"

        result = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
          peers = NEWS_LANG_PEERS.fetch(country_raw, [country_raw])

          # 📰 Las noticias en el idioma del visitante van PRIMERO; las
          # globales (inglés) solo rellenan lo que falte hasta el límite. Sin
          # este orden, los 10 feeds en inglés —que publican mucho más seguido
          # que los 4 en español— copaban las 20 posiciones por fecha y el
          # visitante hispanohablante no veía una sola noticia en su idioma.
          HardwareNews
            .where(country_code: peers + [nil])
            .order(Arel.sql('CASE WHEN country_code IS NULL THEN 1 ELSE 0 END ASC'))
            .order(recorded_at: :desc)
            .limit(NEWS_LIMIT)
            .map do |n|
              {
                category:    n.category,
                title:       n.title,
                summary:     n.summary,
                impactScore: n.impact_score,
                recordedAt:  n.recorded_at,
                sourceUrl:   n.source_url
              }
            end
        end

        render json: result, status: :ok
      rescue StandardError => e
        Rails.logger.error("🚨 [HardwareNews API] Fallo al extraer inteligencia de la DB: #{e.message}")
        render json: [], status: :ok
      end

      # =========================================================
      # 📥 ENDPOINT: POST /api/v1/notebooks/hardware_news
      # =========================================================
      def create_news
        payload = params.to_unsafe_h.deep_symbolize_keys
        news_batch = payload[:news] || []
        
        PersistenceOrchestrator.save_news_batch(news_batch)
        render json: { status: 'SUCCESS', message: "#{news_batch.length} noticias procesadas" }, status: :created
      rescue => e
        Rails.logger.error("🚨 [Create News API] Fallo crítico: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo al guardar noticias' }, status: :internal_server_error
      end

      # =========================================================
      # 📥 ENDPOINT: POST /api/v1/notebooks
      # =========================================================
      # =========================================================
      # 📦 ENDPOINT: POST /api/v1/products/batch
      #
      # Ingesta de hasta BATCH_MAX_ITEMS productos en UN request.
      #
      # POR QUÉ: `create` persiste un producto por request HTTP. Con 70
      # productos era irrelevante; con el catálogo completo de un retailer no
      # cierra — 50.000 productos son 50.000 requests, y con los 5 hilos del
      # MasterOrchestrator eso son ~3 horas de ingesta, más 50.000 arranques
      # de transacción y 50.000 pasadas del stack de Rails.
      #
      # Cada item se persiste en su PROPIA transacción (dentro de
      # `save_raw_offer`), no en una sola gigante: un producto con un precio
      # inválido no puede tirar abajo los otros 499 del lote. Por eso la
      # respuesta informa cuántos entraron y cuántos fallaron en vez de ser
      # todo-o-nada.
      # =========================================================
      # 50 y no 500: Rails corre con `timeoutSeconds: 30` y cada item abre su
      # propia transacción con `lock!`. Medido contra producción, un lote de
      # 500 devolvió 504 a los 30 s — aunque Rails siguió persistiendo por
      # detrás, así que el cliente reportaba fallos sobre datos ya guardados.
      # Debe mantenerse igual a BATCH_MAX_ITEMS en Python/src/rails_client.py.
      BATCH_MAX_ITEMS = 50

      def create_batch
        items = params.to_unsafe_h.deep_symbolize_keys[:items] || []

        unless items.is_a?(Array)
          return render json: { status: 'ERROR', message: 'items debe ser un array' },
                        status: :unprocessable_entity
        end

        if items.length > BATCH_MAX_ITEMS
          return render json: { status: 'ERROR',
                                message: "máximo #{BATCH_MAX_ITEMS} items por lote, llegaron #{items.length}" },
                        status: :unprocessable_entity
        end

        ok = 0
        fallos = []
        items.each_with_index do |item, i|
          PersistenceOrchestrator.save_raw_offer(item)
          ok += 1
        rescue StandardError => e
          # Se registra el índice y el SKU, no el payload entero: un lote de
          # 500 items con error escribiría megabytes de log por request.
          fallos << { index: i, sku: item[:sku_original], error: "#{e.class}: #{e.message}"[0, 200] }
        end

        Rails.logger.warn("[batch] #{fallos.length}/#{items.length} fallaron") if fallos.any?

        render json: { status: 'SUCCESS', persisted: ok, failed: fallos.length, errors: fallos.first(20) },
               status: :created
      rescue StandardError => e
        Rails.logger.error("🚨 [Batch API] #{e.class}: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo al procesar el lote' },
               status: :internal_server_error
      end

      # =====================================================================
      # 🔢 BACKFILL DE SCORING — GET /api/v1/products/unscored
      #
      # `deal_score` arranca en 0 y solo lo pisa el motor de Rust. La cacería
      # diaria re-puntúa únicamente lo que la red devuelve HOY (~878 productos
      # por corrida), así que lo ingerido antes de que el ciclo funcionara se
      # quedó en 0 para siempre: 2231 de 3100 productos al 2026-08-11.
      #
      # Devuelve exactamente los campos que consume el scorer de Rust, con el
      # `id` como identificador en vez del `sku_original`: el SKU solo es único
      # por retailer, y dos comerciantes con el mismo SKU se pisarían al
      # escribir el score de vuelta.
      # =====================================================================
      BACKFILL_MAX = 500

      def unscored
        limite = params[:limit].to_i
        limite = BACKFILL_MAX if limite <= 0
        limite = [limite, BACKFILL_MAX].min

        pendientes = Laptop.where('deal_score IS NULL OR deal_score <= 0')

        items = pendientes.includes(:latest_price).limit(limite).map do |laptop|
          precio = laptop.latest_price
          specs  = build_specs(laptop)

          {
            id:            laptop.id,
            product_type:  product_type_for(laptop),
            cpu:           laptop.procesador.to_s,
            gpu:           laptop.tarjeta_video.to_s,
            ram_gb:        laptop.ram_gb.to_i,
            specs:         specs.is_a?(Hash) ? specs : {},
            rating:        specs.is_a?(Hash) ? specs['rating'].to_f : 0.0,
            reviews:       specs.is_a?(Hash) ? specs['reviews'].to_i : 0,
            current_price:  precio&.precio_actual.to_f,
            original_price: precio&.precio_original.to_f,
            exchange_rate:  precio&.tipo_cambio_aplicado.to_f,
            currency:       precio&.moneda.presence || 'USD'
          }
        end

        render json: { items: items, pending_total: pendientes.count }
      rescue StandardError => e
        Rails.logger.error("🚨 [Unscored API] #{e.class}: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo al listar productos sin score' },
               status: :internal_server_error
      end

      # =====================================================================
      # 🔢 POST /api/v1/products/scores
      #
      # Escribe SOLO la columna `deal_score`. Deliberadamente estrecho: el
      # camino ancho (`products/batch`) reconstruye el producto entero, y usarlo
      # para backfill sobrescribiría con defaults campos que ya tienen dato
      # bueno. Acá no hay forma de perder nada que no sea el score.
      # =====================================================================
      def update_scores
        items = params.to_unsafe_h.deep_symbolize_keys[:items] || []

        unless items.is_a?(Array)
          return render json: { status: 'ERROR', message: 'items debe ser un array' },
                        status: :unprocessable_entity
        end

        actualizados = 0
        descartados  = 0

        Laptop.transaction do
          items.each do |item|
            # ⚠️ `id` es un UUID, no un entero. Un `to_i` acá devolvería 0 para
            # todos y el `where` no matchearía ninguna fila: el backfill
            # reportaría éxito habiendo actualizado exactamente nada.
            id    = item[:id].to_s.strip
            score = item[:deal_score].to_f

            # Un 0 no es un score: es "sin evaluar". Escribirlo dejaría el
            # producto igual que antes pero marcado como ya procesado.
            if id.blank? || score <= 0
              descartados += 1
              next
            end

            actualizados += Laptop.where(id: id)
                                  .update_all(deal_score: score, updated_at: Time.current)
          end
        end

        Rails.logger.info("[scores] #{actualizados} actualizados, #{descartados} descartados")
        render json: { status: 'SUCCESS', updated: actualizados, skipped: descartados }
      rescue StandardError => e
        Rails.logger.error("🚨 [Scores API] #{e.class}: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo al actualizar scores' },
               status: :internal_server_error
      end

      def create
        # 🛠️ Conversión profunda para evitar choques entre Hash de Strings y Símbolos
        payload = params.to_unsafe_h.deep_symbolize_keys

        PersistenceOrchestrator.save_raw_offer(payload)
        render json: { status: 'SUCCESS', message: 'Oferta persistida en Postgres' }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: 'ERROR', message: e.message }, status: :unprocessable_entity
      rescue StandardError => e
        Rails.logger.error("🚨 [Create API] Fallo crítico al guardar: #{e.message}")
        render json: { status: 'ERROR', message: 'Fallo interno del servidor' }, status: :internal_server_error
      end

      private

      # =========================================================
      # 🎛️ SERIALIZADOR DTO (Postgres -> TypeScript)
      # =========================================================
      def serialize_laptop(laptop)
        # 🚀 Se usa la relación optimizada :latest_price sin golpear la memoria RAM
        latest_price = laptop.latest_price
        meta = laptop.metadata_extra || {}

        current_price  = latest_price&.precio_actual.to_f
        original_price = latest_price&.precio_original.to_f
        exchange_rate  = latest_price&.tipo_cambio_aplicado.to_f
        deal_score     = laptop.deal_score.to_f

        # 💱 Descuento calculado en el backend (única fuente de verdad)
        discount_pct =
          if original_price > current_price && original_price > 0
            (((original_price - current_price) / original_price) * 100).round
          else
            0
          end

        {
          id: laptop.id,
          slug: laptop.slug,
          country_code: laptop.country_code,
          currency: latest_price&.moneda || 'USD',
          brand: laptop.marca,
          name: laptop.modelo,
          condition: meta['condition'] || 'new',

          # 📦 Multi-producto: tipo + specs genéricas (ver product.ts / migración v3)
          product_type: product_type_for(laptop),
          specs: build_specs(laptop),

          # Campos dedicados de laptop (retrocompatibles; vacíos en otros tipos)
          hardware: {
            cpu: laptop.procesador,
            ram_gb: laptop.ram_gb,
            storage_gb: laptop.disco_gb,
            gpu: laptop.tarjeta_video,
            display_inches: laptop.display_inches.to_f
          },

          financials: {
            original_price: original_price,
            current_price: current_price,
            discount_pct: discount_pct,
            # 🚀 FIX divisas: el tipo de cambio aplicado ahora viaja al frontend
            applied_exchange_rate: exchange_rate.positive? ? exchange_rate : nil,
            in_stock: true
          },

          intelligence: {
            deal_score: deal_score,
            ai_score_label: ai_score_label_for(deal_score),
            ai_reasoning: laptop.ai_reasoning,
            price_trend: price_trend_for(current_price, original_price),
            category: meta['category'] || 'business',
            is_featured_deal: latest_price&.es_oferta_destacada || deal_score >= 8.5,
            ai_badge: meta['ai_badge'],
            ui_accent_color: meta['ui_accent_color']
          },

          seo: {
            title: meta['seo_title'],
            description: meta['seo_description']
          },

          urls: {
            # 🖼️ Solo la foto real del producto (nil si no hay) — ver Laptop#real_image_url
            image: laptop.real_image_url,
            affiliate_raw: laptop.url_afiliado
          },

          metadata_extra: meta.merge({
            retailer: laptop.retailer&.slug
          })
        }
      end

      # ¿La columna product_type ya existe? (migración v3 aplicada)
      def has_product_type?
        Laptop.column_names.include?('product_type')
      end

      # 📦 Tipo de producto. `has_attribute?` protege entornos donde aún no se
      # corrió migration_products_v3.sql (default seguro: 'laptop').
      def product_type_for(laptop)
        laptop.has_attribute?(:product_type) ? (laptop.product_type.presence || 'laptop') : 'laptop'
      end

      # 📦 Scope base del catálogo, compartido por `index` y por los conteos.
      #
      # El orden es EXPLÍCITO por `id`. Sin `ORDER BY`, Postgres no garantiza
      # un orden estable entre queries, y con paginación eso significa que un
      # producto puede aparecer en la página 1 y en la 3, u ocultarse en las
      # dos — un bug invisible con 70 filas y sistemático con 50.000. Además
      # `id` es la última columna de los índices de la v8, así que el orden
      # sale del índice y no de un sort en memoria.
      def catalog_scope(country, category, type)
        scope = Laptop.includes(:retailer, :latest_price).where(country_code: country)
        scope = scope.where(product_type: type) if type.present?
        if category.present?
          # Semi-join: `product_categories` tiene 56 filas y vive en caché de
          # Postgres, así que resolver la familia no agrega costo medible.
          scope = scope.where(product_type: ProductCategory.codes_for_family(category))
        end
        scope.order(:id)
      end

      # 📂 Arma el árbol categoría → subcategorías desde un hash
      # {product_type => conteo}, sin una query por rama.
      #
      # Las ramas con 0 productos NO se emiten: un menú que ofrece "Servidores"
      # y lleva a una página vacía es peor que no ofrecerlo.
      def build_category_tree(conteos)
        ProductCategory
          .where(code: conteos.keys)
          .order(:family, :code)
          .group_by(&:family)
          .map do |family, cats|
            subs = cats.map { |c| { code: c.code, label: c.label, total: conteos[c.code].to_i } }
                       .reject { |s| s[:total].zero? }
            next if subs.empty?

            { code: family,
              label: FAMILY_LABELS[family] || family.humanize,
              total: subs.sum { |s| s[:total] },
              subcategories: subs.sort_by { |s| -s[:total] } }
          end
          .compact
          .sort_by { |f| -f[:total] }
      end

      # 📦 Specs uniformes para el frontend (SPEC_SCHEMA en product.ts):
      #  - laptop/desktop: se derivan de las columnas dedicadas.
      #  - resto de tipos: se leen del JSONB `specs`.
      # Así la card renderiza cualquier producto con un solo camino de código.
      def build_specs(laptop)
        stored = laptop.has_attribute?(:specs) ? (laptop.specs || {}) : {}
        type   = product_type_for(laptop)

        if %w[laptop desktop].include?(type)
          base = {
            cpu: laptop.procesador,
            ram_gb: laptop.ram_gb,
            storage_gb: laptop.disco_gb,
            gpu: laptop.tarjeta_video
          }
          base[:display_inches] = laptop.display_inches.to_f if type == 'laptop' && laptop.display_inches.present?
          # `specs` del JSONB pisa/complementa lo derivado (fuente de verdad si vino de ingesta).
          base.merge(stored).compact
        else
          stored
        end
      end

      # 🏷️ Etiqueta semántica derivada del score (escala estricta 1.0 - 10.0)
      # 🏷️ Etiqueta de oferta. `nil` cuando NO hay nada que etiquetar.
      #
      # `deal_score` arranca en 0 y solo lo pisa el motor de Rust cuando puntúa
      # de verdad. Un 0 significa "nunca evaluado", no "mala oferta" — pero caía
      # al fallback y salía como 'BAJO', que es una afirmación sobre el producto
      # que nadie calculó. Medido el 2026-08-11: 2231 de 3100 productos de la
      # ingesta anterior al arreglo del ciclo diario estaban en 0, o sea que el
      # 72% del catálogo se estaba autodescalificando por un defecto de datos.
      #
      # Devolver nil es correcto de punta a punta: el serializer emite null y
      # `LaptopCard` ya trata la ausencia de etiqueta como "no mostrar señal".
      def ai_score_label_for(score)
        return nil       if score.to_f <= 0
        return 'ÓPTIMO'  if score >= 9.0
        return 'BUENO'   if score >= 7.5
        return 'REGULAR' if score >= 6.0
        'BAJO'
      end

      # 📈 Tendencia inferida de la relación precio actual vs original
      def price_trend_for(current_price, original_price)
        return 'stable' if original_price.zero? || current_price == original_price
        current_price < original_price ? 'down' : 'up'
      end

    end
  end
end
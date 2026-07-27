class PersistenceOrchestrator
  # 🛡️ Orquestador Transaccional Zero-Trust

  # =========================================================
  # 🛒 PERSISTENCIA DE CATÁLOGO (Amazon, Lenovo, Mercadolibre...)
  # =========================================================
  def self.save_raw_offer(data)
    
    # 1. 🚀 FIX ARQUITECTÓNICO (Race Condition Shield):
    # Asegura la creación concurrente del Retailer. Si varios hilos de Python 
    # insertan a la vez, se captura la excepción de PostgreSQL y se reintenta el SELECT.
    begin
      retailer = Retailer.find_or_create_by!(
        slug: data[:retailer_slug] || 'generic', 
        country_code: data[:country_code] || 'US'
      ) do |r|
        r.name = data[:brand] || "Tienda #{data[:retailer_slug]}"
      end
    rescue ActiveRecord::RecordNotUnique
      retry
    end

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

      # 📈 REGISTRO HISTÓRICO: Verificamos precio delegando en DB
      last_price = laptop.latest_price
      
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
  # 📰 PERSISTENCIA DE NOTICIAS DE HARDWARE (Radar IA)
  # =========================================================
  def self.save_news_batch(news_array)
    return unless news_array.is_a?(Array)
    
    ActiveRecord::Base.transaction do
      news_array.each do |item|
        # Patrón Upsert: Si el título ya existe, lo actualiza (evita errores UNIQUE en BD)
        news = HardwareNews.find_or_initialize_by(title: item[:title])
        news.category = item[:category] || 'Global Tech'
        news.summary = item[:summary] || 'Sin resumen disponible.'
        
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
    end
  rescue => e
    Rails.logger.error("🚨 [Persistence Error] Fallo al guardar noticias: #{e.message}")
    raise e
  end
end
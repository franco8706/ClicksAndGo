if ENV['REDIS_URL'].present?
  Rails.application.config.cache_store = :redis_cache_store, {
    url:                 ENV['REDIS_URL'],
    connect_timeout:     0.5,
    read_timeout:        1.0,
    write_timeout:       0.5,
    reconnect_attempts:  1,
    # Si Redis falla, loguea pero no rompe la request — el controlador sirve desde DB igual
    error_handler: lambda { |method:, returning:, exception:|
      Rails.logger.warn("[Cache] Redis falló en #{method}: #{exception.class}. Sirviendo desde DB.")
    }
  }
else
  # Fallback para Docker local o cuando Memorystore no está configurado
  Rails.application.config.cache_store = :memory_store, { size: 32.megabytes }
end

Rails.application.config.action_controller.perform_caching = true

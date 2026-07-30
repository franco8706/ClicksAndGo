# =========================================================
# 🧪 ENTORNO DE TEST
#
# El proyecto no tenía `config/environments/` porque solo se ejecutaba en
# production (Cloud Run) — este archivo es lo mínimo para poder correr la
# suite sin arrastrar configuración de producción.
#
# Regla dura: los tests NUNCA tocan Cloud SQL. `database.yml` resuelve el
# entorno `test` a `<POSTGRES_DB>_test` por host/usuario, ignorando por
# completo `DATABASE_URL` (que es la de producción).
# =========================================================
Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false

  # Sin caché entre tests: un `Rails.cache.fetch` con TTL haría que un test
  # vea el resultado del anterior y los volvería dependientes del orden.
  config.action_controller.perform_caching = false
  config.cache_store = :null_store

  # Errores completos en vez de la página genérica: si algo falla, el test
  # debe mostrar la excepción real.
  config.consider_all_requests_local = true

  # Silencio en la salida de tests; los fallos ya se reportan por minitest.
  config.logger = Logger.new(File::NULL)
  config.log_level = :fatal

  config.active_support.deprecation = :stderr
end

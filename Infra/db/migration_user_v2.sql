-- =====================================================================
-- CLICKS & GO — User v2 Migration (Dashboard + Geo global)
-- Ejecutar sobre PostgreSQL (Cloud SQL) después de migration_auth_v1.sql.
-- Idempotente: usa IF NOT EXISTS en todos los cambios.
--
-- Contexto: la plataforma opera a nivel mundial. La IP del visitante se
-- usa EN TRÁNSITO (middleware Next.js / geo_controller Rails) para derivar
-- el país; aquí persistimos SOLO el país derivado, no la IP cruda —
-- cumple el propósito (catálogo/noticias regionales, afiliación local)
-- con mínima superficie GDPR/Ley 25.326.
-- =====================================================================

-- 1. Geo + preferencias del usuario
-- country_code: país PREFERIDO por el usuario (override manual del catálogo).
--               NULL = automático según IP en cada visita.
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code     CHAR(2);
-- detected_country: último país detectado por IP (para segmentación,
--                   emails regionales y métricas de mercado).
ALTER TABLE users ADD COLUMN IF NOT EXISTS detected_country CHAR(2);
-- preferred_locale: idioma preferido (es|en|pt) para emails/alertas.
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(5);
-- last_seen_at: última visita al panel (higiene de cuentas / re-engagement).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at     TIMESTAMPTZ;

-- 2. Índices para el dashboard (consultas por usuario)
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user    ON price_alerts(user_id);

-- 3. Índice para el AGENTE DE ALERTAS (Python — futuro PriceAlertAgent):
--    "todas las alertas activas de esta laptop" tras cada actualización de precio.
CREATE INDEX IF NOT EXISTS idx_alerts_laptop_active
    ON price_alerts(laptop_id) WHERE is_active;

-- 4. Higiene de sesiones: índice por expiración para poder purgar
--    sesiones vencidas con un cron barato (DELETE WHERE expires < now()).
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

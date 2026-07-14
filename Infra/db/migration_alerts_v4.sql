-- =====================================================================
-- CLICKS & GO — Alerts v4 Migration (PriceAlertAgent / re-engagement)
-- Ejecutar sobre PostgreSQL (Cloud SQL) después de migration_user_v2.sql.
-- Idempotente: IF NOT EXISTS en todo. ADITIVO y RETROCOMPATIBLE.
--
-- Contexto: el PriceAlertAgent (Python) corre tras cada ciclo de precios,
-- detecta alertas cuyo precio actual ya cayó <= target_price y notifica por
-- email (Resend). Para NO renotificar la misma alerta en cada ciclo, se
-- registra CUÁNDO se avisó por última vez. Rails es quien lee/escribe esto
-- (Zero-Trust: Python solo consume sus endpoints REST).
-- =====================================================================

-- 1. Marca temporal del último aviso enviado. NULL = nunca notificada (o
--    "re-armada" tras volver a subir el precio). Mientras no sea NULL y la
--    alerta siga activa, no se vuelve a enviar email.
ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- 2. Índice del agente: "alertas activas pendientes de avisar". La consulta
--    del ciclo (is_active AND notified_at IS NULL) golpea solo estas filas.
CREATE INDEX IF NOT EXISTS idx_alerts_pending
    ON price_alerts(is_active)
    WHERE is_active AND notified_at IS NULL;

COMMENT ON COLUMN price_alerts.notified_at IS 'Último email de alcance de precio enviado por el PriceAlertAgent. NULL = pendiente / re-armada. Evita renotificar en cada ciclo.';

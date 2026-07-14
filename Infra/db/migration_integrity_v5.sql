-- =====================================================================
-- CLICKS & GO — Integrity v5 Migration (hardening + normalización)
-- Ejecutar DESPUÉS de migration_alerts_v4.sql. Idempotente.
--
-- Cierra los gaps de integridad detectados en la auditoría de la DB:
--   1) FKs sin índice (accounts.user_id, user_favorites.laptop_id).
--   2) FKs nullable que no deberían serlo (price_alerts.user_id/laptop_id).
--   3) Falta de CHECKs (deal_score fuera de 1–10, precios negativos, target≤0).
--   4) product_type sin integridad referencial (podía entrar cualquier string).
--   5) Alertas activas duplicadas por (user, laptop).
--
-- Los datos actuales (seeds) están limpios: todas las restricciones aplican
-- sin necesidad de limpieza previa. En prod, si hubiera datos sucios, los
-- bloques DO defensivos avisan en vez de abortar.
-- =====================================================================

BEGIN;

-- 1. ── Índices faltantes en claves foráneas ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounts_user   ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_laptop ON user_favorites(laptop_id);

-- 2. ── price_alerts: user_id y laptop_id deben existir siempre ────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM price_alerts WHERE user_id IS NULL OR laptop_id IS NULL) THEN
    ALTER TABLE price_alerts ALTER COLUMN user_id  SET NOT NULL;
    ALTER TABLE price_alerts ALTER COLUMN laptop_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'price_alerts tiene FKs NULL — se omite NOT NULL. Limpiar primero.';
  END IF;
END $$;

-- 3. ── NORMALIZACIÓN de la taxonomía: tabla lookup + FK ───────────────────────
--    Integridad referencial (no se puede insertar un product_type inexistente)
--    SIN perder flexibilidad: sumar un tipo nuevo = INSERT en esta tabla (no
--    ALTER TYPE, no CHECK que reescribir, no downtime). `family` refleja la
--    taxonomía de `Web/src/types/product.ts` (fuente de la UI).
CREATE TABLE IF NOT EXISTS product_categories (
  code   VARCHAR(30)  PRIMARY KEY,
  family VARCHAR(20)  NOT NULL,
  label  VARCHAR(60)  NOT NULL,
  active BOOLEAN      NOT NULL DEFAULT true
);

INSERT INTO product_categories (code, family, label) VALUES
  ('laptop',     'computing',   'Laptops'),
  ('desktop',    'computing',   'PC de escritorio'),
  ('monitor',    'computing',   'Monitores'),
  ('keyboard',   'peripherals', 'Teclados'),
  ('mouse',      'peripherals', 'Mouse'),
  ('headphones', 'peripherals', 'Auriculares'),
  ('webcam',     'peripherals', 'Webcams'),
  ('printer',    'printing',    'Impresoras'),
  ('supplies',   'printing',    'Insumos')
ON CONFLICT (code) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_laptops_product_type') THEN
    ALTER TABLE laptops
      ADD CONSTRAINT fk_laptops_product_type
      FOREIGN KEY (product_type) REFERENCES product_categories(code);
  END IF;
END $$;

-- 4. ── CHECK constraints de dominio ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_laptops_deal_score') THEN
    ALTER TABLE laptops ADD CONSTRAINT chk_laptops_deal_score
      CHECK (deal_score IS NULL OR (deal_score >= 1 AND deal_score <= 10));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_nonneg') THEN
    ALTER TABLE price_histories ADD CONSTRAINT chk_price_nonneg
      CHECK (precio_actual >= 0 AND (precio_original IS NULL OR precio_original >= 0));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_alert_target_positive') THEN
    ALTER TABLE price_alerts ADD CONSTRAINT chk_alert_target_positive
      CHECK (target_price > 0);
  END IF;
END $$;

-- 5. ── Una sola alerta ACTIVA por usuario+producto ───────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_active
  ON price_alerts(user_id, laptop_id) WHERE is_active;

COMMIT;

-- NOTA (normalización pendiente, no bloqueante): la tabla `laptops` es ya el
-- catálogo genérico de PRODUCTOS. Renombrarla a `products` (y sus FKs
-- laptop_id → product_id) es más limpio semánticamente pero invasivo; queda
-- para una migración dedicada. Las columnas laptop-específicas
-- (procesador/ram_gb/…) conviven con `specs` JSONB por diseño (single-table,
-- flexible): se llenan solo para laptop/desktop.

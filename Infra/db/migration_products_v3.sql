-- =====================================================================
-- CLICKS & GO — Products v3 Migration (Escalado multi-producto)
-- Ejecutar sobre PostgreSQL (Cloud SQL) después de migration_user_v2.sql.
-- Idempotente: IF NOT EXISTS en todo. ADITIVO y RETROCOMPATIBLE.
--
-- Contexto: la plataforma nació con notebooks pero escala a TODO el
-- catálogo digital de los retailers (desktops, monitores, teclados,
-- mouse, auriculares, webcams, impresoras, insumos...). En vez de una
-- tabla por producto, generalizamos la tabla `laptops` a un CATÁLOGO
-- GENÉRICO: los campos comunes (marca, modelo, precio, país, afiliado,
-- deal_score) siguen como columnas; las specs propias de cada tipo van
-- a un JSONB flexible `specs` (mismo patrón que `metadata_extra`).
--
-- No rompe nada: las filas existentes quedan como product_type='laptop'
-- y sus specs viejas siguen en las columnas procesador/ram_gb/... El
-- serializer las expone en `hardware` (laptops) y en `specs` (genérico).
-- =====================================================================

-- 1. Discriminador de tipo de producto.
--    VARCHAR (no ENUM nativo) a propósito: sumar un tipo nuevo NO requiere
--    ALTER TYPE ni downtime — solo insertar filas con el nuevo valor.
--    Taxonomía v1 (nivel 2 · product_type):
--      Computación : laptop · desktop · monitor
--      Periféricos : keyboard · mouse · headphones · webcam
--      Impresión   : printer · supplies
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS product_type VARCHAR(30) NOT NULL DEFAULT 'laptop';

-- 2. Specs genéricas por tipo (JSONB). Ej:
--      monitor  -> {"size_inches":27,"resolution":"2560x1440","refresh_hz":165,"panel":"IPS"}
--      keyboard -> {"switch":"red","layout":"full","wireless":true,"backlit":true}
--      printer  -> {"technology":"laser","color":true,"ppm":22,"wifi":true}
--    Las laptops mantienen sus columnas dedicadas; `specs` queda '{}' salvo
--    que se quiera duplicar. Ningún otro servicio toca la DB directo: Rails
--    lee/escribe `specs`, Python lo envía en el POST de ingesta.
ALTER TABLE laptops ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}';

-- 3. Backfill defensivo (por si alguna fila quedó con NULL antes del DEFAULT).
UPDATE laptops SET product_type = 'laptop' WHERE product_type IS NULL;

-- 4. Índice del catálogo: el frontend pide "productos de tipo X en país Y".
--    Reemplaza al scan por país cuando se filtra por tipo.
CREATE INDEX IF NOT EXISTS idx_products_type_country
    ON laptops(product_type, country_code);

-- 5. Índice GIN para futuras búsquedas por specs (ej: "monitores 4K", "teclados wireless").
CREATE INDEX IF NOT EXISTS idx_products_specs_gin
    ON laptops USING GIN (specs);

-- 6. Documentación viva del esquema.
COMMENT ON COLUMN laptops.product_type IS 'Tipo de producto (laptop|desktop|monitor|keyboard|mouse|headphones|webcam|printer|supplies). Discriminador del catálogo multi-producto.';
COMMENT ON COLUMN laptops.specs IS 'Specs específicas del tipo de producto (JSONB flexible). Las laptops usan además las columnas procesador/ram_gb/disco_gb/tarjeta_video/display_inches.';

-- NOTA: la tabla sigue llamándose `laptops` por retrocompatibilidad (modelos,
-- FKs de price_histories/user_favorites/price_alerts y seeds existentes la
-- referencian). Conceptualmente es ya el catálogo de PRODUCTOS. Renombrarla
-- físicamente a `products` es una migración posterior opcional (requiere
-- actualizar FKs) y NO es necesaria para operar multi-producto.

-- =====================================================================
-- CLICKS & GO — Real Images v6 (purga de imágenes mock + guarda de esquema)
-- Ejecutar DESPUÉS de migration_integrity_v5.sql. Idempotente.
--
-- REGLA DE NEGOCIO: el catálogo solo muestra la foto REAL del producto.
-- Si no la hay, `image_url` queda NULL y el frontend dibuja un ícono
-- neutro de la categoría (ProductImage.tsx) — nunca la foto de otro
-- artículo. Mostrar una imagen ajena como si fuera el producto listado
-- es representación engañosa: FTC §5, Directiva 2005/29/CE (prácticas
-- comerciales desleales) y Ley 24.240 art. 4 (información veraz).
--
-- POR QUÉ ESTA MIGRACIÓN
-- Auditoría HTTP de las 63 URLs distintas del catálogo vivo (GET real con
-- User-Agent de browser, validando status 200 + Content-Type image/*):
--
--   images.unsplash.com .................. 22  fotos decorativas de stock
--   ssl-product-images.www8-hp.com ....... 7   404 (ruta inexistente)
--   p2-ofp.static.pub / p3-ofp.static.pub  12  404 (ruta inexistente)
--   i.dell.com ........................... 8   403 (Scene7 ante asset ausente)
--   dlcdnwebimgs.asus.com ................ 4   302 → HTML (id inválido)
--   static.acer.com ...................... 2   403
--   hybrismediaprod.blob.core.windows.net  1   404
--   ar-media.hptstore.com ................ 1   dominio que no resuelve
--   store.storeimages.cdn-apple.com ...... 2 OK / 2 404
--   asset.msi.com ........................ 2 OK
--
-- Es decir: de 63 URLs sembradas solo 4 devuelven una imagen real. El
-- resto son mock — o stock decorativo, o rutas de CDN inventadas que
-- jamás cargaron. Se purgan todas; sobreviven únicamente las verificadas.
--
-- Las imágenes reales vuelven por el pipeline, no por seeds: los feeds de
-- afiliados (Awin `merchant_image_url`, CJ `image-url`, Impact) y Amazon
-- PA-API traen la foto oficial de cada listing. `data_normalizer.py` ahora
-- valida la URL antes de persistirla (ver `_clean_image_url`).
-- =====================================================================

BEGIN;

-- 1. ── Fotos de stock decorativas ────────────────────────────────────────────
--    Nunca son el producto: son bancos de imágenes genéricos.
UPDATE laptops SET image_url = NULL
WHERE image_url IS NOT NULL
  AND (   image_url ILIKE '%//images.unsplash.com/%'
       OR image_url ILIKE '%//unsplash.com/%'
       OR image_url ILIKE '%//placehold.co/%'
       OR image_url ILIKE '%//via.placeholder.com/%'
       OR image_url ILIKE '%//placekitten.com/%'
       OR image_url ILIKE '%//dummyimage.com/%'
       OR image_url ILIKE '%//loremflickr.com/%'
       OR image_url ILIKE '%//picsum.photos/%');

-- 2. ── Rutas de CDN de fabricante inventadas por el seed ──────────────────────
--    Hosts legítimos, rutas que no existen: el 100% de las URLs de estos
--    hosts falló la verificación (404 / 403 / redirect a HTML / NXDOMAIN).
--    No se filtra por host en el código — el host sigue permitido para
--    cuando el pipeline traiga una URL real y verificada del mismo CDN.
UPDATE laptops SET image_url = NULL
WHERE image_url IS NOT NULL
  AND (   image_url ILIKE '%//ssl-product-images.www8-hp.com/%'
       OR image_url ILIKE '%//p2-ofp.static.pub/%'
       OR image_url ILIKE '%//p3-ofp.static.pub/%'
       OR image_url ILIKE '%//i.dell.com/%'
       OR image_url ILIKE '%//dlcdnwebimgs.asus.com/%'
       OR image_url ILIKE '%//static.acer.com/%'
       OR image_url ILIKE '%//hybrismediaprod.blob.core.windows.net/%'
       OR image_url ILIKE '%//ar-media.hptstore.com/%');

-- 3. ── Host mixto (Apple): se purgan solo las rutas muertas ───────────────────
--    2 de las 4 URLs de este CDN sí devuelven la foto oficial; esas quedan.
UPDATE laptops SET image_url = NULL
WHERE image_url IN (
  'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/macbook-air-midnight-select-202402',
  'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mbp14-spaceblack-select-202310'
);

-- 4. ── Guarda de esquema: ninguna foto de stock puede volver a entrar ─────────
--    Defensa en profundidad junto a `_clean_image_url` (Python, ingesta) y
--    `real_image_url` (Rails, serialización). Acá el motor lo hace imposible.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_laptops_no_stock_image'
  ) THEN
    ALTER TABLE laptops ADD CONSTRAINT chk_laptops_no_stock_image CHECK (
      image_url IS NULL OR (
            image_url NOT ILIKE '%//images.unsplash.com/%'
        AND image_url NOT ILIKE '%//unsplash.com/%'
        AND image_url NOT ILIKE '%//placehold.co/%'
        AND image_url NOT ILIKE '%//via.placeholder.com/%'
        AND image_url NOT ILIKE '%//placekitten.com/%'
        AND image_url NOT ILIKE '%//dummyimage.com/%'
        AND image_url NOT ILIKE '%//loremflickr.com/%'
        AND image_url NOT ILIKE '%//picsum.photos/%'
        AND image_url ILIKE 'https://%'
      )
    );
  END IF;
END $$;

-- 5. ── Reporte ────────────────────────────────────────────────────────────────
DO $$
DECLARE con_foto INT; sin_foto INT;
BEGIN
  SELECT COUNT(*) INTO con_foto FROM laptops WHERE image_url IS NOT NULL;
  SELECT COUNT(*) INTO sin_foto FROM laptops WHERE image_url IS NULL;
  RAISE NOTICE 'Imágenes reales: % · Sin foto (ícono de categoría): %', con_foto, sin_foto;
END $$;

COMMIT;

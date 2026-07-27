-- =====================================================================
-- 🛠️ CLICKS & GO - PARCHE DE CONSISTENCIA CLOUD v4.1 (idempotente)
-- Corrige: escala de deal_score (0-100 -> 1-10), país/moneda,
-- geo en noticias y siembra multi-región para enrutamiento geográfico.
-- =====================================================================

-- 0) Completar el enum de monedas (el cloud solo tenia USD/ARS).
--    ADD VALUE debe ejecutarse fuera de un bloque de transaccion.
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'EUR';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'MXN';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'BRL';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'COP';
ALTER TYPE currency_type ADD VALUE IF NOT EXISTS 'CLP';

BEGIN;

-- 1) Normalizar deal_score a la escala contractual 1.0 - 10.0
UPDATE laptops
SET deal_score = LEAST(ROUND(deal_score / 10.0, 1), 10.0)
WHERE deal_score IS NOT NULL AND deal_score > 10.0;

-- 2) Alinear país con la moneda real: los 5 registros base están en ARS
UPDATE laptops l
SET country_code = 'AR'
FROM price_histories ph
WHERE ph.laptop_id = l.id
  AND ph.moneda = 'ARS'
  AND l.country_code <> 'AR';

-- 3) Geolocalización de noticias de hardware
ALTER TABLE hardware_news ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- 4) Retailers multi-región (alineados con Schema/retailers.json y middleware)
INSERT INTO retailers (name, slug, base_url, affiliate_tag, country_code) VALUES
  ('Best Buy US',          'best_buy_us',     'https://www.bestbuy.com/',            'clickgo08-20',      'US'),
  ('Amazon Espana',        'amazon_es',       'https://www.amazon.es/',              'clicksandgo-es-21', 'ES'),
  ('Mercado Libre Mexico', 'mercadolibre_mx', 'https://www.mercadolibre.com.mx/',    'clicksandgo-mx-20', 'MX')
ON CONFLICT (slug, country_code) DO NOTHING;

-- 5) Catálogo multi-región (deal_score ya en escala 1-10). Idempotente por slug.
INSERT INTO laptops
  (retailer_id, sku_original, slug, marca, modelo, country_code, procesador, ram_gb, disco_gb,
   tarjeta_video, display_inches, deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES
  ((SELECT id FROM retailers WHERE slug='best_buy_us' AND country_code='US'),
   'BB-DELL-XPS15', 'dell-xps-15-9530-us', 'Dell', 'XPS 15 9530', 'US',
   'Intel Core i7-13700H', 16, 1024, 'NVIDIA RTX 4050', 15.6, 8.7,
   'Ultrabook premium de aluminio con pantalla OLED, ideal para creadores.',
   'https://www.bestbuy.com/site/dell-xps-15?tag=clickgo08-20',
   NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
   '{"category":"creator","ai_badge":"Creator Pro","ui_accent_color":"blue-500"}'),

  ((SELECT id FROM retailers WHERE slug='best_buy_us' AND country_code='US'),
   'BB-LEN-LOQ15', 'lenovo-loq-15-us', 'Lenovo', 'LOQ 15', 'US',
   'AMD Ryzen 7 7840HS', 16, 512, 'NVIDIA RTX 4060', 15.6, 9.1,
   'Relacion precio/rendimiento sobresaliente para gaming 1080p.',
   'https://www.bestbuy.com/site/lenovo-loq-15?tag=clickgo08-20',
   NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
   '{"category":"gaming","ai_badge":"Gamer Pro","ui_accent_color":"emerald-500"}'),

  ((SELECT id FROM retailers WHERE slug='amazon_es' AND country_code='ES'),
   'ES-HP-PAV14', 'hp-pavilion-aero-14-es', 'HP', 'Pavilion Aero 14', 'ES',
   'AMD Ryzen 5 7535U', 16, 512, 'AMD Radeon 660M', 14.0, 8.3,
   'Ultraligero (menos de 1 kg) con gran autonomia para oficina movil.',
   'https://www.amazon.es/dp/hp-pavilion-aero-14?tag=clicksandgo-es-21',
   NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
   '{"category":"ultrabook","ai_badge":"Ultraligera","ui_accent_color":"blue-500"}'),

  ((SELECT id FROM retailers WHERE slug='mercadolibre_mx' AND country_code='MX'),
   'MLM-ACER-N16', 'acer-nitro-16-mx', 'Acer', 'Nitro 16', 'MX',
   'AMD Ryzen 5 7640HS', 16, 512, 'NVIDIA RTX 4050', 16.0, 8.0,
   'Equipo gamer accesible con pantalla de 165 Hz para e-sports.',
   'https://www.mercadolibre.com.mx/acer-nitro-16?matt_tool=clicksandgo-mx-20',
   NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
   '{"category":"gaming","ai_badge":"Gamer","ui_accent_color":"emerald-500"}')
ON CONFLICT (slug) DO NOTHING;

-- 6) Precios para el catálogo multi-región (solo si aún no tienen historial)
INSERT INTO price_histories (laptop_id, precio_actual, precio_original, moneda, tipo_cambio_aplicado, es_oferta_destacada)
SELECT l.id, v.actual, v.original, v.moneda::currency_type, v.fx, v.destacada
FROM (VALUES
  ('dell-xps-15-9530-us',     1499.00, 1799.00, 'USD',    1.0,   true),
  ('lenovo-loq-15-us',         999.00, 1199.00, 'USD',    1.0,   true),
  ('hp-pavilion-aero-14-es',   849.00,  999.00, 'EUR',    0.92,  false),
  ('acer-nitro-16-mx',       21999.00,24999.00, 'MXN',   17.50,  true)
) AS v(slug, actual, original, moneda, fx, destacada)
JOIN laptops l ON l.slug = v.slug
WHERE NOT EXISTS (SELECT 1 FROM price_histories ph WHERE ph.laptop_id = l.id);

-- 7) Noticias de hardware semilla (geolocalizadas) para activar el slider
INSERT INTO hardware_news (category, title, summary, impact_score, country_code) VALUES
  ('AI Hardware', 'NVIDIA presenta drivers optimizados para laptops RTX', 'Mejoras de hasta 15% en rendimiento de juegos para portatiles RTX serie 40.', 'HIGH', 'US'),
  ('Mercado', 'Hot Sale impulsa descuentos en notebooks gamer', 'Las tiendas oficiales anticipan bajas agresivas de precio en equipos gamer.', 'MEDIUM', 'AR'),
  ('Procesadores', 'AMD Ryzen AI llega a mas ultrabooks en Europa', 'La nueva generacion con NPU dedicada mejora la autonomia y tareas de IA local.', 'HIGH', 'ES')
ON CONFLICT (title) DO NOTHING;

COMMIT;

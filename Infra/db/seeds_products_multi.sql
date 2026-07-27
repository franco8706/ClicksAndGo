-- ==============================================================================
-- CLICKS & GO — CATÁLOGO MULTI-PRODUCTO v1 (seed)
-- Extiende el catálogo más allá de notebooks: monitores, teclados, mouse,
-- auriculares, webcams, impresoras, desktops e insumos.
--
-- REQUIERE: migration_products_v3.sql (columnas product_type + specs).
-- Ejecutar DESPUÉS de seeds_catalog.sql:
--   psql $DATABASE_URL -f Infra/db/seeds_products_multi.sql
-- Idempotente: ON CONFLICT DO NOTHING / DO UPDATE — seguro re-ejecutar.
--
-- 🖼️ IMÁGENES: `image_url` va NULL a propósito. Los seeds NO inventan fotos.
-- La auditoría HTTP de 2026-07-27 mostró que las URLs sembradas eran o stock
-- decorativo o rutas de CDN inexistentes (404/403). La foto real entra solo
-- por el pipeline (feeds de afiliados / Amazon PA-API), que la verifica antes
-- de persistirla; sin foto real el frontend dibuja el ícono de la categoría.
-- Ver migration_real_images_v6.sql.
-- ==============================================================================

-- ── RETAILERS (marketplaces + marcas de periféricos/impresión) ────────────────
INSERT INTO retailers (name, slug, base_url, affiliate_tag, country_code) VALUES
  ('Amazon US',        'amazon_us',       'https://www.amazon.com/',            'clicksandgo-20',    'US'),
  ('Best Buy US',      'best_buy_us',      'https://www.bestbuy.com/',           'clicks_bestbuy_us', 'US'),
  ('Amazon España',    'amazon_es',       'https://www.amazon.es/',             'clicksandgo-es-21', 'ES'),
  ('MercadoLibre MX',  'mercadolibre_mx', 'https://www.mercadolibre.com.mx/',   'clicks_ml_mx',      'MX')
ON CONFLICT DO NOTHING;  -- catch-all: cubre uq de slug Y de (name,country) según el entorno

-- ── PRODUCTOS ─────────────────────────────────────────────────────────────────
-- Nota: procesador/ram_gb/disco_gb/tarjeta_video/display_inches quedan NULL en
-- productos sin hardware de cómputo; las specs propias van al JSONB `specs`.
INSERT INTO laptops (retailer_id, sku_original, slug, marca, modelo, country_code,
  product_type, specs,
  procesador, ram_gb, disco_gb, tarjeta_video, display_inches,
  deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES

-- ─────────── MONITORES ───────────
((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'MON-LG-27GP850', 'lg-ultragear-27gp850-us', 'LG', 'UltraGear 27GP850-B', 'US',
 'monitor', '{"size_inches":27,"resolution":"2560x1440","refresh_hz":165,"panel":"IPS Nano"}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.7, 'Monitor gaming QHD de 165Hz con panel IPS Nano y 1ms — colores precisos y fluidez para juego competitivo.',
 'https://www.amazon.com/dp/B08T6DHVFH?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"monitor","ai_badge":"165Hz","ui_accent_color":"#2563eb","seo_title":"LG UltraGear 27GP850 QHD 165Hz","seo_description":"Monitor gaming QHD 165Hz IPS Nano al mejor precio verificado."}'::jsonb),

((SELECT id FROM retailers WHERE slug='best_buy_us' AND country_code='US'),
 'MON-SAM-G7-32', 'samsung-odyssey-g7-32-us', 'Samsung', 'Odyssey G7 32"', 'US',
 'monitor', '{"size_inches":32,"resolution":"2560x1440","refresh_hz":240,"panel":"VA curvo"}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.4, 'Panel curvo 1000R de 240Hz — inmersión total y respuesta ultrarrápida para shooters.',
 'https://www.bestbuy.com/site/samsung-odyssey-g7/6435300.p?tag=clicks_bestbuy_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"monitor","ai_badge":"240Hz","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'MON-DELL-U2723QE', 'dell-ultrasharp-u2723qe-us', 'Dell', 'UltraSharp U2723QE 4K', 'US',
 'monitor', '{"size_inches":27,"resolution":"3840x2160","refresh_hz":60,"panel":"IPS Black"}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.1, '4K IPS Black con hub USB-C 90W — la referencia para trabajo profesional y color.',
 'https://www.amazon.com/dp/B09WMS9YM4?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"monitor","ai_badge":"4K USB-C","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_es' AND country_code='ES'),
 'MON-LG-27GP850-ES', 'lg-ultragear-27gp850-es', 'LG', 'UltraGear 27GP850-B', 'ES',
 'monitor', '{"size_inches":27,"resolution":"2560x1440","refresh_hz":165,"panel":"IPS Nano"}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.5, 'Monitor gaming QHD 165Hz IPS Nano — el favorito de la gama media para juego y trabajo.',
 'https://www.amazon.es/dp/B08T6DHVFH?tag=clicksandgo-es-21',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"monitor","ai_badge":"165Hz","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── TECLADOS ───────────
((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'KBD-KEY-K8PRO', 'keychron-k8-pro-us', 'Keychron', 'K8 Pro Wireless', 'US',
 'keyboard', '{"switch":"Gateron Brown","layout":"TKL","wireless":true,"backlit":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.2, 'Mecánico TKL hot-swap con QMK/VIA e inalámbrico — escritura precisa para trabajo y código.',
 'https://www.amazon.com/dp/B09NNGL3VV?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"keyboard","ai_badge":"Mecánico","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'KBD-LOG-MXKEYS', 'logitech-mx-keys-s-us', 'Logitech', 'MX Keys S', 'US',
 'keyboard', '{"switch":"Scissor","layout":"Full","wireless":true,"backlit":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.0, 'Teclado de perfil bajo, silencioso y multi-dispositivo — el estándar de productividad.',
 'https://www.amazon.com/dp/B0B47QChoC?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"keyboard","ai_badge":"Productividad","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='best_buy_us' AND country_code='US'),
 'KBD-RAZ-BWV4', 'razer-blackwidow-v4-us', 'Razer', 'BlackWidow V4', 'US',
 'keyboard', '{"switch":"Razer Green","layout":"Full","wireless":false,"backlit":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 7.6, 'Mecánico clicky con Chroma RGB y teclas de macro — pensado para gaming.',
 'https://www.bestbuy.com/site/razer-blackwidow-v4/6535075.p?tag=clicks_bestbuy_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"keyboard","ai_badge":"Gaming RGB","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── MOUSE ───────────
((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'MOU-LOG-MXM3S', 'logitech-mx-master-3s-us', 'Logitech', 'MX Master 3S', 'US',
 'mouse', '{"dpi":8000,"sensor":"Darkfield","buttons":7,"wireless":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.9, 'Ergonómico de 8000 DPI con scroll MagSpeed y clicks silenciosos — rey de la productividad.',
 'https://www.amazon.com/dp/B09HM94VDS?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"mouse","ai_badge":"Productividad","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'MOU-RAZ-DAV3PRO', 'razer-deathadder-v3-pro-us', 'Razer', 'DeathAdder V3 Pro', 'US',
 'mouse', '{"dpi":30000,"sensor":"Focus Pro","buttons":5,"wireless":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.3, 'Ultraligero (63g) con sensor Focus Pro 30K — precisión de esports inalámbrica.',
 'https://www.amazon.com/dp/B0B8SRXNPB?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"mouse","ai_badge":"Esports","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_es' AND country_code='ES'),
 'MOU-LOG-MXM3S-ES', 'logitech-mx-master-3s-es', 'Logitech', 'MX Master 3S', 'ES',
 'mouse', '{"dpi":8000,"sensor":"Darkfield","buttons":7,"wireless":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.7, 'Ergonómico de 8000 DPI con scroll MagSpeed — precisión y confort para largas jornadas.',
 'https://www.amazon.es/dp/B09HM94VDS?tag=clicksandgo-es-21',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"mouse","ai_badge":"Productividad","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── AURICULARES ───────────
((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'HP-SONY-XM5', 'sony-wh-1000xm5-us', 'Sony', 'WH-1000XM5', 'US',
 'headphones', '{"form":"Over-ear","driver_mm":30,"anc":true,"wireless":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 9.1, 'La referencia en cancelación de ruido — audio limpio y 30h de batería para viajes y oficina.',
 'https://www.amazon.com/dp/B09XS7JWHH?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"headphones","ai_badge":"ANC Premium","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='best_buy_us' AND country_code='US'),
 'HP-BOSE-QCU', 'bose-quietcomfort-ultra-us', 'Bose', 'QuietComfort Ultra', 'US',
 'headphones', '{"form":"Over-ear","driver_mm":35,"anc":true,"wireless":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.5, 'Audio espacial inmersivo y ANC de referencia — comodidad premium para largas sesiones.',
 'https://www.bestbuy.com/site/bose-quietcomfort-ultra/6551024.p?tag=clicks_bestbuy_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"headphones","ai_badge":"Audio espacial","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='mercadolibre_mx' AND country_code='MX'),
 'HP-SONY-XM5-MX', 'sony-wh-1000xm5-mx', 'Sony', 'WH-1000XM5', 'MX',
 'headphones', '{"form":"Over-ear","driver_mm":30,"anc":true,"wireless":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.8, 'Cancelación de ruido líder y gran autonomía — ideal para home office y traslados.',
 'https://www.mercadolibre.com.mx/sony-wh-1000xm5/p/MLM123456?tag=clicks_ml_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"headphones","ai_badge":"ANC Premium","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── WEBCAMS ───────────
((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'CAM-LOG-BRIO4K', 'logitech-brio-4k-us', 'Logitech', 'Brio 4K', 'US',
 'webcam', '{"resolution":"4K","fps":30,"mic":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 7.9, 'Webcam 4K con HDR y corrección de luz — imagen nítida para videollamadas y streaming.',
 'https://www.amazon.com/dp/B01N5UOYC4?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"webcam","ai_badge":"4K HDR","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'CAM-RAZ-KIYOPRO', 'razer-kiyo-pro-us', 'Razer', 'Kiyo Pro', 'US',
 'webcam', '{"resolution":"1080p","fps":60,"mic":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 7.5, '1080p a 60fps con sensor adaptable a poca luz — pensada para streaming fluido.',
 'https://www.amazon.com/dp/B08T1MWX6J?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"webcam","ai_badge":"1080p60","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── IMPRESORAS ───────────
((SELECT id FROM retailers WHERE slug='hp_us' AND country_code='US'),
 'PRN-HP-M234DWE', 'hp-laserjet-m234dwe-us', 'HP', 'LaserJet M234dwe', 'US',
 'printer', '{"technology":"Láser","ppm":30,"color":false,"wifi":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.0, 'Láser monocromática compacta con WiFi y 6 meses de tóner incluido — confiable para casa/oficina.',
 'https://www.hp.com/us-en/shop/pdp/hp-laserjet-m234dwe?aff=clicks_hp_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"printer","ai_badge":"Oficina","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'PRN-EPS-ET2850', 'epson-ecotank-et2850-us', 'Epson', 'EcoTank ET-2850', 'US',
 'printer', '{"technology":"Tinta EcoTank","ppm":15,"color":true,"wifi":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 8.2, 'Sin cartuchos: tanques recargables con años de tinta — el costo por página más bajo.',
 'https://www.amazon.com/dp/B08XLWSFF1?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"printer","ai_badge":"EcoTank","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'PRN-BRO-L2350DW', 'brother-hl-l2350dw-us', 'Brother', 'HL-L2350DW', 'US',
 'printer', '{"technology":"Láser","ppm":32,"color":false,"wifi":true}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 7.8, 'Láser mono rápida (32ppm) con dúplex automático y WiFi — trabajadora incansable.',
 'https://www.amazon.com/dp/B078Z2WBGV?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"printer","ai_badge":"Dúplex","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── DESKTOPS ───────────
((SELECT id FROM retailers WHERE slug='hp_us' AND country_code='US'),
 'DSK-HP-VICTUS15L', 'hp-victus-15l-desktop-us', 'HP', 'Victus 15L Gaming Desktop', 'US',
 'desktop', '{"cpu":"AMD Ryzen 5 8600G","ram_gb":16,"storage_gb":1024,"gpu":"NVIDIA RTX 4060"}'::jsonb,
 'AMD Ryzen 5 8600G', 16, 1024, 'NVIDIA RTX 4060', NULL,
 8.3, 'Torre gaming accesible con RTX 4060 — 1080p ultra y creación de contenido sin problemas.',
 'https://www.hp.com/us-en/shop/pdp/victus-15l-desktop?aff=clicks_hp_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","ai_badge":"Gaming Desktop","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='lenovo_us' AND country_code='US'),
 'DSK-LEN-LEGT5', 'lenovo-legion-tower-5-us', 'Lenovo', 'Legion Tower 5', 'US',
 'desktop', '{"cpu":"AMD Ryzen 7 7700","ram_gb":16,"storage_gb":1024,"gpu":"NVIDIA RTX 4070"}'::jsonb,
 'AMD Ryzen 7 7700', 16, 1024, 'NVIDIA RTX 4070', NULL,
 8.6, 'Potencia de sobra con RTX 4070 y refrigeración optimizada — 1440p de alto refresco.',
 'https://www.lenovo.com/us/en/p/legion-tower-5?aff=clicks_lenovo_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","ai_badge":"RTX 4070","ui_accent_color":"#2563eb"}'::jsonb),

-- ─────────── INSUMOS ───────────
((SELECT id FROM retailers WHERE slug='hp_us' AND country_code='US'),
 'SUP-HP-667TRI', 'hp-667-cartucho-tricolor-us', 'HP', '667 Cartucho Tricolor', 'US',
 'supplies', '{"kind":"Cartucho de tinta","compatibility":"HP DeskJet 2775 / 2720","yield_pages":120}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 7.4, 'Cartucho tricolor original HP — colores fieles y compatibilidad garantizada con tu DeskJet.',
 'https://www.hp.com/us-en/shop/pdp/hp-667-tri-color?aff=clicks_hp_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"supplies","ai_badge":"Original","ui_accent_color":"#2563eb"}'::jsonb),

((SELECT id FROM retailers WHERE slug='amazon_us' AND country_code='US'),
 'SUP-EPS-522BK', 'epson-522-tinta-negra-us', 'Epson', '522 EcoTank Tinta Negra', 'US',
 'supplies', '{"kind":"Botella de tinta","compatibility":"EcoTank ET-2720 / ET-2800","yield_pages":7500}'::jsonb,
 NULL, NULL, NULL, NULL, NULL,
 7.7, 'Botella de tinta EcoTank de alto rendimiento — hasta 7.500 páginas por un precio mínimo.',
 'https://www.amazon.com/dp/B07TWFVDND?tag=clicksandgo-20',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"supplies","ai_badge":"Alto rendimiento","ui_accent_color":"#2563eb"}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  specs        = EXCLUDED.specs,
  deal_score   = EXCLUDED.deal_score,
  metadata_extra = EXCLUDED.metadata_extra;

-- ── HISTORIAL DE PRECIOS (idempotente por slug) ───────────────────────────────
-- tipo_cambio_aplicado = unidades por 1 USD (USD → NULL, EUR ≈ 0.92, MXN ≈ 17).
INSERT INTO price_histories (laptop_id, precio_actual, precio_original, moneda, tipo_cambio_aplicado, es_oferta_destacada)
SELECT l.id, v.actual, v.original, v.moneda::currency_type, v.tc, (l.deal_score >= 8.5)
FROM (VALUES
  -- Monitores
  ('lg-ultragear-27gp850-us',      329,  449,  'USD', NULL::numeric),
  ('samsung-odyssey-g7-32-us',     599,  799,  'USD', NULL),
  ('dell-ultrasharp-u2723qe-us',   549,  699,  'USD', NULL),
  ('lg-ultragear-27gp850-es',      359,  479,  'EUR', 0.92),
  -- Teclados
  ('keychron-k8-pro-us',            89,  109,  'USD', NULL),
  ('logitech-mx-keys-s-us',         99,  109,  'USD', NULL),
  ('razer-blackwidow-v4-us',       139,  169,  'USD', NULL),
  -- Mouse
  ('logitech-mx-master-3s-us',      79,   99,  'USD', NULL),
  ('razer-deathadder-v3-pro-us',   129,  149,  'USD', NULL),
  ('logitech-mx-master-3s-es',      89,  119,  'EUR', 0.92),
  -- Auriculares
  ('sony-wh-1000xm5-us',           298,  399,  'USD', NULL),
  ('bose-quietcomfort-ultra-us',   379,  429,  'USD', NULL),
  ('sony-wh-1000xm5-mx',          5999, 8499,  'MXN', 17.0),
  -- Webcams
  ('logitech-brio-4k-us',          149,  199,  'USD', NULL),
  ('razer-kiyo-pro-us',             99,  129,  'USD', NULL),
  -- Impresoras
  ('hp-laserjet-m234dwe-us',       139,  199,  'USD', NULL),
  ('epson-ecotank-et2850-us',      249,  299,  'USD', NULL),
  ('brother-hl-l2350dw-us',        119,  149,  'USD', NULL),
  -- Desktops
  ('hp-victus-15l-desktop-us',     899, 1099,  'USD', NULL),
  ('lenovo-legion-tower-5-us',    1299, 1499,  'USD', NULL),
  -- Insumos
  ('hp-667-cartucho-tricolor-us',   18,   24,  'USD', NULL),
  ('epson-522-tinta-negra-us',      12,   15,  'USD', NULL)
) AS v(slug, actual, original, moneda, tc)
JOIN laptops l ON l.slug = v.slug
WHERE NOT EXISTS (SELECT 1 FROM price_histories ph WHERE ph.laptop_id = l.id);

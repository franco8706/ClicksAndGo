-- ==============================================================================
-- CLICKS & GO — CATÁLOGO MULTI-REGIÓN v2
-- 40 laptops: AR (10) / US (10) / ES (7) / MX (7) / BR (6)
-- Ejecutar: psql $DATABASE_URL -f Infra/db/seeds_catalog.sql
-- Idempotente: ON CONFLICT DO NOTHING / DO UPDATE — seguro re-ejecutar.
-- ==============================================================================

-- ── RETAILERS ──────────────────────────────────────────────────────────────────
INSERT INTO retailers (name, slug, base_url, affiliate_tag, country_code) VALUES
  -- Argentina
  ('Lenovo Argentina',  'lenovo_ar',  'https://www.lenovo.com/ar/es/',       'clicks_lenovo_ar',  'AR'),
  ('HP Store',          'hp_ar',      'https://www.hp.com/ar-es/',            'clicks_hp_ar',      'AR'),
  ('Dell Argentina',    'dell_ar',    'https://www.dell.com/es-ar/',          'clicks_dell_ar',    'AR'),
  ('Asus Argentina',    'asus_ar',    'https://www.asus.com/ar/',             'clicks_asus_ar',    'AR'),
  ('Apple Oficial',     'apple_ar',   'https://www.apple.com/la/',            'clicks_apple_ar',   'AR'),
  ('MSI Argentina',     'msi_ar',     'https://la.msi.com/Laptops/',          'clicks_msi_ar',     'AR'),
  ('Acer Argentina',    'acer_ar',    'https://www.acer.com/ar-es/',          'clicks_acer_ar',    'AR'),
  -- United States
  ('Dell US',           'dell_us',    'https://www.dell.com/en-us/',          'clicks_dell_us',    'US'),
  ('HP US',             'hp_us',      'https://www.hp.com/us-en/',            'clicks_hp_us',      'US'),
  ('Lenovo US',         'lenovo_us',  'https://www.lenovo.com/us/en/',        'clicks_lenovo_us',  'US'),
  ('Asus US',           'asus_us',    'https://www.asus.com/us/',             'clicks_asus_us',    'US'),
  ('Apple US',          'apple_us',   'https://www.apple.com/shop/',          'clicks_apple_us',   'US'),
  ('MSI US',            'msi_us',     'https://us.msi.com/Laptops/',          'clicks_msi_us',     'US'),
  ('Razer US',          'razer_us',   'https://www.razer.com/laptops/',       'clicks_razer_us',   'US'),
  ('Acer US',           'acer_us',    'https://www.acer.com/us-en/',          'clicks_acer_us',    'US'),
  -- Spain
  ('HP Spain',          'hp_es',      'https://www.hp.com/es-es/',            'clicks_hp_es',      'ES'),
  ('Lenovo Spain',      'lenovo_es',  'https://www.lenovo.com/es/es/',        'clicks_lenovo_es',  'ES'),
  ('Dell Spain',        'dell_es',    'https://www.dell.com/es-es/',          'clicks_dell_es',    'ES'),
  ('Asus Spain',        'asus_es',    'https://www.asus.com/es/',             'clicks_asus_es',    'ES'),
  -- Mexico
  ('HP Mexico',         'hp_mx',      'https://www.hp.com/mx-es/',            'clicks_hp_mx',      'MX'),
  ('Lenovo Mexico',     'lenovo_mx',  'https://www.lenovo.com/mx/es/',        'clicks_lenovo_mx',  'MX'),
  ('Dell Mexico',       'dell_mx',    'https://www.dell.com/es-mx/',          'clicks_dell_mx',    'MX'),
  ('Asus Mexico',       'asus_mx',    'https://www.asus.com/mx/',             'clicks_asus_mx',    'MX'),
  -- Brazil
  ('Dell Brazil',       'dell_br',    'https://www.dell.com/pt-br/',          'clicks_dell_br',    'BR'),
  ('Lenovo Brazil',     'lenovo_br',  'https://www.lenovo.com/br/pt/',        'clicks_lenovo_br',  'BR'),
  ('HP Brazil',         'hp_br',      'https://www.hp.com/br-pt/',            'clicks_hp_br',      'BR'),
  ('Acer Brazil',       'acer_br',    'https://www.acer.com/br-pt/',          'clicks_acer_br',    'BR'),
  ('Asus Brazil',       'asus_br',    'https://www.asus.com/br/',             'clicks_asus_br',    'BR')
ON CONFLICT (slug, country_code) DO NOTHING;

-- ==============================================================================
-- ARGENTINA (ARS — tipo de cambio ~1450 por USD)
-- ==============================================================================
INSERT INTO laptops (retailer_id, sku_original, slug, marca, modelo, country_code,
  procesador, ram_gb, disco_gb, tarjeta_video, display_inches,
  deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES

-- 1. Lenovo Legion Pro 7i Gen 9 ── GAMING ÉLITE (score 9.5)
((SELECT id FROM retailers WHERE slug='lenovo_ar' AND country_code='AR'),
 'LOQ-82XV00LAAR', 'lenovo-legion-pro-7i-gen9-ar',
 'Lenovo', 'Legion Pro 7i Gen 9', 'AR',
 'Intel Core i9-14900HX', 32, 1024, 'NVIDIA RTX 4080 12GB', 16.0,
 9.5, 'Potencia de escritorio en formato portátil. Ideal para gaming competitivo en 4K y creación de contenido pesado.',
 'https://www.lenovo.com/ar/es/p/laptops/legion-laptops/legion-pro-series/legion-pro-7i-gen-9?aff=clicks_lenovo_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Lenovo Legion Pro 7i Gen 9 — RTX 4080 al mejor precio","seo_description":"La laptop gaming más potente de Lenovo con Intel Core i9 y RTX 4080. Ideal para juegos y edición 4K.","ai_badge":"GAMING PRO","ui_accent_color":"#DC2626"}'::jsonb),

-- 2. Lenovo IdeaPad Slim 5 Gen 9 ── TRABAJO DIARIO (score 6.0)
((SELECT id FROM retailers WHERE slug='lenovo_ar' AND country_code='AR'),
 'IDEAPAD-S5G9-AR', 'lenovo-ideapad-slim-5-gen9-ar',
 'Lenovo', 'IdeaPad Slim 5 Gen 9', 'AR',
 'AMD Ryzen 5 7530U', 16, 512, 'AMD Radeon 610M', 15.6,
 6.0, 'Laptop liviana y silenciosa perfecta para tareas de oficina, estudio y videollamadas.',
 'https://www.lenovo.com/ar/es/p/laptops/ideapad/ideapad-500-series/ideapad-slim-5-gen-9?aff=clicks_lenovo_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"Lenovo IdeaPad Slim 5 Gen 9 — Liviana y eficiente","seo_description":"Laptop ultraliviana con AMD Ryzen 5, pantalla Full HD y batería de todo el día.","ui_accent_color":"#2563EB"}'::jsonb),

-- 3. HP Pavilion 15-eg3 ── RELACIÓN PRECIO-CALIDAD (score 5.0)
((SELECT id FROM retailers WHERE slug='hp_ar' AND country_code='AR'),
 'HP-PAV15-EG3-AR', 'hp-pavilion-15-eg3-ar',
 'HP', 'Pavilion 15-eg3', 'AR',
 'Intel Core i5-1335U', 8, 512, 'Intel Iris Xe', 15.6,
 5.0, 'Buena opción de entrada para estudiantes y uso cotidiano con pantalla grande y diseño moderno.',
 'https://www.hp.com/ar-es/shop/pdp/hp-pavilion-laptop-15-eg3?aff=clicks_hp_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"HP Pavilion 15 — Laptop para estudiantes","seo_description":"Laptop HP con Intel Core i5 de última generación, pantalla Full HD de 15.6 pulgadas.","ui_accent_color":"#D97706"}'::jsonb),

-- 4. HP ENVY x360 14 ── CONVERTIBLE PREMIUM (score 6.5, descuento 15%)
((SELECT id FROM retailers WHERE slug='hp_ar' AND country_code='AR'),
 'HP-ENVY-X360-14-AR', 'hp-envy-x360-14-ar',
 'HP', 'ENVY x360 14', 'AR',
 'AMD Ryzen 7 7730U', 16, 512, 'AMD Radeon 610M', 14.0,
 6.5, 'Convertible 2-en-1 con pantalla táctil OLED y lápiz incluido. Ideal para artistas y diseñadores.',
 'https://www.hp.com/ar-es/shop/pdp/hp-envy-x360-2-in-1-laptop-14-fa0?aff=clicks_hp_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"HP ENVY x360 14 — Convertible táctil premium","seo_description":"Laptop convertible con AMD Ryzen 7, pantalla táctil y diseño elegante 2 en 1.","ui_accent_color":"#2563EB"}'::jsonb),

-- 5. Dell XPS 13 9340 ── ULTRABOOK PROFESIONAL (score 6.5)
((SELECT id FROM retailers WHERE slug='dell_ar' AND country_code='AR'),
 'XPS13-9340-AR', 'dell-xps-13-9340-ar',
 'Dell', 'XPS 13 9340', 'AR',
 'Intel Core i7-1355U', 16, 512, 'Intel Iris Xe', 13.4,
 6.5, 'El ultrabook más compacto de Dell con pantalla OLED 3.5K. Perfecto para profesionales en movimiento.',
 'https://www.dell.com/es-ar/shop/laptops/xps-13-laptop/spd/xps-13-9340-laptop?aff=clicks_dell_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"Dell XPS 13 — El ultrabook más elegante","seo_description":"Pantalla OLED infinita, Intel Core i7 y solo 1.2 kg. Diseñado para profesionales exigentes.","ui_accent_color":"#2563EB"}'::jsonb),

-- 6. Dell Vostro 15 3525 ── PRECIO IMBATIBLE (score 5.5, descuento 19%)
((SELECT id FROM retailers WHERE slug='dell_ar' AND country_code='AR'),
 'VOSTRO15-3525-AR', 'dell-vostro-15-3525-ar',
 'Dell', 'Vostro 15 3525', 'AR',
 'AMD Ryzen 5 5500U', 8, 512, 'AMD Radeon', 15.6,
 5.5, 'La opción más accesible de Dell con gran durabilidad y soporte empresarial.',
 'https://www.dell.com/es-ar/shop/laptops/vostro-15-3525/spd/vostro-15-3525-laptop?aff=clicks_dell_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Dell Vostro 15 — Precio imbatible con garantía Dell","seo_description":"Laptop Dell con AMD Ryzen 5, construcción robusta y excelente soporte técnico.","ai_badge":"MEJOR PRECIO","ui_accent_color":"#D97706"}'::jsonb),

-- 7. Asus ROG Strix G16 2023 ── GAMING POTENTE (score 8.0)
((SELECT id FROM retailers WHERE slug='asus_ar' AND country_code='AR'),
 'ROG-G614JV-AR', 'asus-rog-strix-g16-g614jv-ar',
 'Asus', 'ROG Strix G16 G614JV', 'AR',
 'Intel Core i9-13980HX', 16, 1024, 'NVIDIA RTX 4060 8GB', 16.0,
 8.0, 'Diseño agresivo, pantalla de 165 Hz y refrigeración de triple ventilador. La favorita de los gamers argentinos.',
 'https://www.asus.com/ar/laptops/for-gaming/rog-strix/rog-strix-g16-2023-g614jv/?aff=clicks_asus_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Asus ROG Strix G16 — Gaming en 165 Hz con RTX 4060","seo_description":"Laptop gaming con Intel Core i9, RTX 4060 y pantalla de alta frecuencia. Dominá cada partida.","ai_badge":"GAMING PRO","ui_accent_color":"#DC2626"}'::jsonb),

-- 8. Asus VivoBook 15 X1504ZA ── ESTUDIANTES (score 5.0)
((SELECT id FROM retailers WHERE slug='asus_ar' AND country_code='AR'),
 'VIVOBOOK15-X1504ZA', 'asus-vivobook-15-x1504za-ar',
 'Asus', 'VivoBook 15 X1504ZA', 'AR',
 'Intel Core i5-1235U', 8, 512, 'Intel Iris Xe', 15.6,
 5.0, 'Liviana, colorida y eficiente. La compañera ideal para clases presenciales y virtuales.',
 'https://www.asus.com/ar/laptops/for-home/vivobook/asus-vivobook-15-x1504/?aff=clicks_asus_ar',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Asus VivoBook 15 — Liviana para el día a día","seo_description":"Laptop Asus con Intel Core i5, batería de todo el día y diseño compacto para estudiantes.","ui_accent_color":"#D97706"}'::jsonb),

-- 9. Apple MacBook Air M2 ── PREMIUM APPLE (score 5.0)
((SELECT id FROM retailers WHERE slug='apple_ar' AND country_code='AR'),
 'MBA-M2-13-AR', 'apple-macbook-air-m2-13-ar',
 'Apple', 'MacBook Air M2 13"', 'AR',
 'Apple M2 (8-core CPU)', 8, 256, 'Apple 8-core GPU', 13.6,
 5.0, 'La laptop más vendida del mundo: batería de 18 horas, sin ventilador y pantalla Liquid Retina.',
 'https://www.apple.com/la/shop/buy-mac/macbook-air/13-pulgadas-m2?aff=clicks_apple_ar',
 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mba13-midnight-select-202402',
 '{"condition":"new","category":"ultrabook","seo_title":"MacBook Air M2 13 pulgadas — La laptop perfecta","seo_description":"Chip Apple M2, hasta 18 horas de batería y solo 1.24 kg. La laptop sin ventilador más rápida del mercado.","ui_accent_color":"#2563EB"}'::jsonb),

-- 10. MSI Katana 15 B12VEK ── GAMING ACCESIBLE (score 7.5)
((SELECT id FROM retailers WHERE slug='msi_ar' AND country_code='AR'),
 'KATANA15-B12VEK-AR', 'msi-katana-15-b12vek-ar',
 'MSI', 'Katana 15 B12VEK', 'AR',
 'Intel Core i7-12650H', 16, 512, 'NVIDIA RTX 4060 8GB', 15.6,
 7.5, 'La entrada al gaming de alto rendimiento con RTX 4060 y pantalla de 144 Hz a precio competitivo.',
 'https://la.msi.com/Laptop/Katana-15-B12VX/Specifications?aff=clicks_msi_ar',
 NULL,  -- placeholder de marca, no el producto (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"MSI Katana 15 — Gaming RTX 4060 con pantalla 144Hz","seo_description":"Laptop gaming MSI con Intel Core i7, RTX 4060 y pantalla Full HD de alta frecuencia.","ai_badge":"MEJOR OFERTA","ui_accent_color":"#DC2626"}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  procesador=EXCLUDED.procesador, ram_gb=EXCLUDED.ram_gb, disco_gb=EXCLUDED.disco_gb,
  tarjeta_video=EXCLUDED.tarjeta_video, deal_score=EXCLUDED.deal_score,
  ai_reasoning=EXCLUDED.ai_reasoning, image_url=EXCLUDED.image_url,
  metadata_extra=EXCLUDED.metadata_extra, updated_at=CURRENT_TIMESTAMP;

-- ==============================================================================
-- UNITED STATES (USD)
-- ==============================================================================
INSERT INTO laptops (retailer_id, sku_original, slug, marca, modelo, country_code,
  procesador, ram_gb, disco_gb, tarjeta_video, display_inches,
  deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES

-- 11. Dell XPS 15 9530 ── POWERHOUSE (score 10.0, descuento 16%)
((SELECT id FROM retailers WHERE slug='dell_us' AND country_code='US'),
 'XPS15-9530-US', 'dell-xps-15-9530-us',
 'Dell', 'XPS 15 9530', 'US',
 'Intel Core i9-13900H', 32, 1024, 'NVIDIA RTX 4070 8GB', 15.6,
 10.0, 'The most powerful XPS ever. OLED touch display, top-tier CPU and GPU in a premium 15-inch form factor.',
 'https://www.dell.com/en-us/shop/dell-laptops/xps-15-laptop/spd/xps-15-9530-laptop?aff=clicks_dell_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"creator","seo_title":"Dell XPS 15 9530 — Best Laptop for Creators","seo_description":"32GB RAM, RTX 4070 and OLED display. The ultimate laptop for video editors and developers.","ai_badge":"TOP DEAL","ui_accent_color":"#7C3AED"}'::jsonb),

-- 12. HP Spectre x360 14 ── PREMIUM CONVERTIBLE (score 6.5)
((SELECT id FROM retailers WHERE slug='hp_us' AND country_code='US'),
 'SPECTRE-X360-14-US', 'hp-spectre-x360-14-us',
 'HP', 'Spectre x360 14', 'US',
 'Intel Core i7-1355U', 16, 512, 'Intel Iris Xe', 14.0,
 6.5, 'HP''s flagship 2-in-1 with OLED display, stylus support and premium gem-cut aluminum design.',
 'https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-2-in-1-laptop-14-ef2?aff=clicks_hp_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"HP Spectre x360 14 — Premium 2-in-1 Laptop","seo_description":"OLED convertible with Intel Core i7, stylus and 17-hour battery. The best HP laptop for professionals.","ui_accent_color":"#2563EB"}'::jsonb),

-- 13. Lenovo ThinkPad X1 Carbon Gen 11 ── BUSINESS ELITE (score 6.5)
((SELECT id FROM retailers WHERE slug='lenovo_us' AND country_code='US'),
 'X1CARBON-G11-US', 'lenovo-thinkpad-x1-carbon-gen11-us',
 'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'US',
 'Intel Core i7-1365U', 16, 512, 'Intel Iris Xe', 14.0,
 6.5, 'The gold standard for business laptops: MIL-SPEC certified, legendary keyboard and enterprise security.',
 'https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-11?aff=clicks_lenovo_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"business","seo_title":"ThinkPad X1 Carbon Gen 11 — Best Business Laptop","seo_description":"MIL-SPEC durability, Intel vPro and the iconic ThinkPad keyboard in under 1.12 kg.","ui_accent_color":"#059669"}'::jsonb),

-- 14. Asus ROG Zephyrus G14 GA402XV ── GAMING COMPACT (score 9.5)
((SELECT id FROM retailers WHERE slug='asus_us' AND country_code='US'),
 'ROG-G14-GA402XV-US', 'asus-rog-zephyrus-g14-ga402xv-us',
 'Asus', 'ROG Zephyrus G14 2023', 'US',
 'AMD Ryzen 9 7940HS', 16, 1024, 'NVIDIA RTX 4090 16GB', 14.0,
 9.5, 'RTX 4090 in a 14-inch body. The most powerful compact gaming laptop ever built.',
 'https://www.asus.com/us/laptops/for-gaming/rog-zephyrus/rog-zephyrus-g14-2023/?aff=clicks_asus_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Asus ROG Zephyrus G14 — RTX 4090 in 14 Inches","seo_description":"The most powerful compact gaming laptop: RTX 4090, Ryzen 9 and 120Hz OLED screen in 1.65 kg.","ai_badge":"GAMING PRO","ui_accent_color":"#DC2626"}'::jsonb),

-- 15. MSI Raider GE78 HX ── FLAGSHIP GAMING (score 10.0)
((SELECT id FROM retailers WHERE slug='msi_us' AND country_code='US'),
 'RAIDER-GE78-HX-US', 'msi-raider-ge78-hx-us',
 'MSI', 'Raider GE78 HX', 'US',
 'Intel Core i9-13980HX', 32, 2048, 'NVIDIA RTX 4090 16GB', 17.3,
 10.0, 'The absolute peak of mobile gaming performance. Desktop-grade CPU, RTX 4090 and 240Hz display.',
 'https://us.msi.com/Laptop/Raider-GE78-HX-13V?aff=clicks_msi_us',
 NULL,  -- placeholder de marca, no el producto (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"MSI Raider GE78 HX — The Ultimate Gaming Laptop","seo_description":"RTX 4090, 32GB RAM and 240Hz display. No compromises — the fastest gaming laptop money can buy.","ai_badge":"BEST IN CLASS","ui_accent_color":"#DC2626"}'::jsonb),

-- 16. Razer Blade 15 2023 ── PREMIUM GAMING (score 8.5)
((SELECT id FROM retailers WHERE slug='razer_us' AND country_code='US'),
 'BLADE15-2023-US', 'razer-blade-15-2023-us',
 'Razer', 'Blade 15 2023', 'US',
 'Intel Core i9-13900H', 16, 1024, 'NVIDIA RTX 4070 8GB', 15.6,
 8.5, 'The MacBook Pro of gaming laptops: CNC-machined aluminum, QHD 240Hz display and Thunderbolt 4.',
 'https://www.razer.com/gaming-laptops/razer-blade-15?aff=clicks_razer_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Razer Blade 15 — The Laptop for Power Users","sso_description":"CNC aluminum, RTX 4070 and 240Hz QHD display. The premium choice for serious gamers.","ui_accent_color":"#DC2626"}'::jsonb),

-- 17. Apple MacBook Pro 16 M3 Max ── CREATOR FLAGSHIP (score 8.0)
((SELECT id FROM retailers WHERE slug='apple_us' AND country_code='US'),
 'MBP16-M3MAX-US', 'apple-macbook-pro-16-m3-max-us',
 'Apple', 'MacBook Pro 16" M3 Max', 'US',
 'Apple M3 Max (16-core)', 36, 1024, 'Apple 40-core GPU', 16.2,
 8.0, 'The world''s most powerful laptop for professional video and audio production. 22 hours battery life.',
 'https://www.apple.com/shop/buy-mac/macbook-pro/16-inch-m3-max?aff=clicks_apple_us',
 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mbp16-spaceblack-select-202310',
 '{"condition":"new","category":"creator","seo_title":"MacBook Pro 16 M3 Max — Best Laptop for Video Editing","seo_description":"Apple M3 Max chip, 36GB unified memory and Liquid Retina XDR display. The ultimate creative tool.","ai_badge":"EDITOR''S CHOICE","ui_accent_color":"#7C3AED"}'::jsonb),

-- 18. Acer Predator Helios 300 PH315 ── GAMING VALUE (score 8.0, descuento 23%)
((SELECT id FROM retailers WHERE slug='acer_us' AND country_code='US'),
 'PREDATOR-PH315-55-US', 'acer-predator-helios-300-ph315-us',
 'Acer', 'Predator Helios 300 PH315', 'US',
 'Intel Core i7-12700H', 16, 512, 'NVIDIA RTX 3060 6GB', 15.6,
 8.0, 'Best budget-friendly gaming laptop: IPS 165Hz display, excellent thermal management and upgradeable RAM.',
 'https://www.acer.com/us-en/laptops/predator/predator-helios-300?aff=clicks_acer_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Acer Predator Helios 300 — Best Value Gaming Laptop","seo_description":"RTX 3060, 165Hz IPS display and i7 processor at the best price. Dominate every game.","ai_badge":"BEST VALUE","ui_accent_color":"#DC2626"}'::jsonb),

-- 19. Lenovo IdeaPad Gaming 3 Gen 7 ── GAMING ENTRY (score 5.5)
((SELECT id FROM retailers WHERE slug='lenovo_us' AND country_code='US'),
 'IDEAPAD-G3-GEN7-US', 'lenovo-ideapad-gaming-3-gen7-us',
 'Lenovo', 'IdeaPad Gaming 3 Gen 7', 'US',
 'AMD Ryzen 5 6600H', 8, 512, 'NVIDIA RTX 3050 4GB', 15.6,
 5.5, 'The most affordable way to enter PC gaming. Proven Ryzen 6000 series and dedicated RTX graphics.',
 'https://www.lenovo.com/us/en/p/laptops/ideapad/ideapad-gaming-laptops/ideapad-gaming-3-gen-7?aff=clicks_lenovo_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Lenovo IdeaPad Gaming 3 — Affordable Gaming Laptop","seo_description":"Entry-level gaming with Ryzen 5 and RTX 3050. The best way to start your PC gaming journey.","ui_accent_color":"#D97706"}'::jsonb),

-- 20. HP Victus 16-e1 ── GAMING BUDGET (score 6.0, descuento 18%)
((SELECT id FROM retailers WHERE slug='hp_us' AND country_code='US'),
 'VICTUS16-E1-US', 'hp-victus-16-e1-us',
 'HP', 'Victus 16-e1', 'US',
 'Intel Core i5-12450H', 8, 512, 'NVIDIA RTX 3050 4GB', 16.1,
 6.0, 'HP enters the gaming arena at an unbeatable price. 16-inch display and dedicated RTX graphics under $700.',
 'https://www.hp.com/us-en/shop/pdp/hp-victus-gaming-laptop-16-e1?aff=clicks_hp_us',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"HP Victus 16 — Gaming Laptop Under $700","seo_description":"Dedicated RTX 3050 graphics and i5 processor at an affordable price. Great for casual gaming.","ai_badge":"BEST VALUE","ui_accent_color":"#D97706"}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  procesador=EXCLUDED.procesador, ram_gb=EXCLUDED.ram_gb, disco_gb=EXCLUDED.disco_gb,
  tarjeta_video=EXCLUDED.tarjeta_video, deal_score=EXCLUDED.deal_score,
  ai_reasoning=EXCLUDED.ai_reasoning, image_url=EXCLUDED.image_url,
  metadata_extra=EXCLUDED.metadata_extra, updated_at=CURRENT_TIMESTAMP;

-- ==============================================================================
-- SPAIN (EUR — tipo de cambio ~0.92 por USD)
-- ==============================================================================
INSERT INTO laptops (retailer_id, sku_original, slug, marca, modelo, country_code,
  procesador, ram_gb, disco_gb, tarjeta_video, display_inches,
  deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES

-- 21. HP Pavilion Plus 14 ── CREACIÓN MULTIMEDIA (score 6.5)
((SELECT id FROM retailers WHERE slug='hp_es' AND country_code='ES'),
 'HP-PAV-PLUS14-ES', 'hp-pavilion-plus-14-es',
 'HP', 'Pavilion Plus 14-eh1', 'ES',
 'Intel Core i7-13700H', 16, 512, 'Intel Iris Xe', 14.0,
 6.5, 'Pantalla OLED 2.8K con colores brillantes y procesador de alto rendimiento para creadores de contenido.',
 'https://www.hp.com/es-es/shop/pdp/hp-pavilion-plus-laptop-14-eh1?aff=clicks_hp_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"creator","seo_title":"HP Pavilion Plus 14 — Pantalla OLED para creadores","seo_description":"Laptop con pantalla OLED 2.8K, Intel Core i7 y diseño premium para profesionales creativos.","ui_accent_color":"#7C3AED"}'::jsonb),

-- 22. Lenovo IdeaPad 5 Pro 14 ── TRABAJO REMOTO (score 7.0, descuento 17%)
((SELECT id FROM retailers WHERE slug='lenovo_es' AND country_code='ES'),
 'IDEAPAD5PRO-14-ES', 'lenovo-ideapad-5-pro-14-es',
 'Lenovo', 'IdeaPad 5 Pro 14AHP9', 'ES',
 'AMD Ryzen 7 7745HX', 16, 512, 'NVIDIA RTX 4050 6GB', 14.0,
 7.0, 'Gran equilibrio entre portabilidad y potencia. Pantalla 2.8K de alta resolución ideal para teletrabajar.',
 'https://www.lenovo.com/es/es/p/laptops/ideapad/ideapad-500-series/ideapad-5-pro-gen-9-14?aff=clicks_lenovo_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"Lenovo IdeaPad 5 Pro 14 — Teletrabajo sin límites","seo_description":"Ryzen 7 potente, pantalla 2.8K y batería de larga duración. La elección perfecta para trabajar desde casa.","ai_badge":"MEJOR OFERTA","ui_accent_color":"#2563EB"}'::jsonb),

-- 23. Dell Latitude 5540 ── EMPRESARIAL (score 6.5)
((SELECT id FROM retailers WHERE slug='dell_es' AND country_code='ES'),
 'LATITUDE-5540-ES', 'dell-latitude-5540-es',
 'Dell', 'Latitude 5540', 'ES',
 'Intel Core i7-1365U', 16, 512, 'Intel Iris Xe', 15.6,
 6.5, 'La elección estándar del mercado empresarial europeo: gestión remota integrada y seguridad de nivel corporativo.',
 'https://www.dell.com/es-es/shop/laptops/latitude-5540/spd/latitude-15-5540-laptop?aff=clicks_dell_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"business","seo_title":"Dell Latitude 5540 — Laptop empresarial de confianza","seo_description":"Intel Core i7 vPro, gestión remota y construcción robusta para entornos corporativos.","ui_accent_color":"#059669"}'::jsonb),

-- 24. Asus Zenbook 14 OLED ── ULTRABOOK PREMIUM (score 7.0, descuento 15%)
((SELECT id FROM retailers WHERE slug='asus_es' AND country_code='ES'),
 'ZENBOOK14-OLED-ES', 'asus-zenbook-14-oled-es',
 'Asus', 'Zenbook 14 OLED UX3402', 'ES',
 'Intel Core i7-13700H', 16, 512, 'NVIDIA RTX 3050 4GB', 14.0,
 7.0, 'Pantalla OLED de 2.8K con certificación PANTONE. La laptop más elegante de Asus para profesionales.',
 'https://www.asus.com/es/laptops/for-home/zenbook/asus-zenbook-14-oled-ux3402/?aff=clicks_asus_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"creator","seo_title":"Asus Zenbook 14 OLED — Pantalla PANTONE profesional","seo_description":"Pantalla OLED 2.8K con certificación PANTONE, Intel Core i7 y diseño ultra delgado.","ui_accent_color":"#7C3AED"}'::jsonb),

-- 25. HP EliteBook 840 G10 ── SEGURIDAD EMPRESARIAL (score 6.5)
((SELECT id FROM retailers WHERE slug='hp_es' AND country_code='ES'),
 'ELITEBOOK-840G10-ES', 'hp-elitebook-840-g10-es',
 'HP', 'EliteBook 840 G10', 'ES',
 'Intel Core i7-1355U', 16, 512, 'Intel Iris Xe', 14.0,
 6.5, 'El estándar de seguridad en laptops empresariales: HP Sure Start, Sure View y cifrado de hardware integrado.',
 'https://www.hp.com/es-es/shop/pdp/hp-elitebook-840-14-inch-g10-notebook-pc?aff=clicks_hp_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"business","seo_title":"HP EliteBook 840 G10 — Máxima seguridad empresarial","seo_description":"Seguridad de nivel empresarial, Intel Core i7 y pantalla antirreflejo de 14 pulgadas.","ui_accent_color":"#059669"}'::jsonb),

-- 26. Lenovo ThinkPad E14 Gen 5 ── BUSINESS ECONÓMICO (score 5.0)
((SELECT id FROM retailers WHERE slug='lenovo_es' AND country_code='ES'),
 'THINKPAD-E14G5-ES', 'lenovo-thinkpad-e14-gen5-es',
 'Lenovo', 'ThinkPad E14 Gen 5', 'ES',
 'AMD Ryzen 5 7530U', 8, 512, 'AMD Radeon', 14.0,
 5.0, 'El punto de entrada a la línea ThinkPad: teclado premium y durabilidad empresarial a precio accesible.',
 'https://www.lenovo.com/es/es/p/laptops/thinkpad/thinkpade/thinkpad-e14-gen-5?aff=clicks_lenovo_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"business","seo_title":"ThinkPad E14 Gen 5 — Acceso al ecosistema ThinkPad","seo_description":"Teclado icónico ThinkPad, AMD Ryzen 5 y construcción robusta al mejor precio de entrada.","ui_accent_color":"#059669"}'::jsonb),

-- 27. Dell XPS 13 Plus 9320 ── DISEÑO MINIMALISTA (score 6.5)
((SELECT id FROM retailers WHERE slug='dell_es' AND country_code='ES'),
 'XPS13PLUS-9320-ES', 'dell-xps-13-plus-9320-es',
 'Dell', 'XPS 13 Plus 9320', 'ES',
 'Intel Core i7-1360P', 16, 512, 'Intel Iris Xe', 13.4,
 6.5, 'El diseño más minimalista del mercado: teclado sin discontinuidades, pantalla sin bordes y solo 1.24 kg.',
 'https://www.dell.com/es-es/shop/laptops/xps-13-plus/spd/xps-13-plus-9320-laptop?aff=clicks_dell_es',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"Dell XPS 13 Plus — El ultrabook más elegante","seo_description":"Diseño sin discontinuidades, pantalla OLED sin bordes e Intel Core i7 en solo 1.24 kg.","ui_accent_color":"#2563EB"}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  procesador=EXCLUDED.procesador, ram_gb=EXCLUDED.ram_gb, disco_gb=EXCLUDED.disco_gb,
  tarjeta_video=EXCLUDED.tarjeta_video, deal_score=EXCLUDED.deal_score,
  ai_reasoning=EXCLUDED.ai_reasoning, image_url=EXCLUDED.image_url,
  metadata_extra=EXCLUDED.metadata_extra, updated_at=CURRENT_TIMESTAMP;

-- ==============================================================================
-- MEXICO (MXN — tipo de cambio ~17.5 por USD)
-- ==============================================================================
INSERT INTO laptops (retailer_id, sku_original, slug, marca, modelo, country_code,
  procesador, ram_gb, disco_gb, tarjeta_video, display_inches,
  deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES

-- 28. HP Laptop 15s-fq5 ── ESTUDIANTES MÉXICO (score 5.5, descuento 17%)
((SELECT id FROM retailers WHERE slug='hp_mx' AND country_code='MX'),
 'HP-15S-FQ5-MX', 'hp-laptop-15s-fq5-mx',
 'HP', 'Laptop 15s-fq5', 'MX',
 'Intel Core i5-1235U', 8, 512, 'Intel Iris Xe', 15.6,
 5.5, 'La laptop más vendida en México para estudiantes universitarios. Ligera, económica y confiable.',
 'https://www.hp.com/mx-es/shop/pdp/hp-laptop-15s-fq5?aff=clicks_hp_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"HP Laptop 15s — La mejor laptop para estudiantes en México","seo_description":"Intel Core i5, pantalla Full HD y 8 horas de batería. La opción más popular para universitarios.","ai_badge":"MEJOR PRECIO","ui_accent_color":"#D97706"}'::jsonb),

-- 29. Lenovo IdeaPad 3 Gen 7 ── BÁSICA ECONÓMICA (score 4.0)
((SELECT id FROM retailers WHERE slug='lenovo_mx' AND country_code='MX'),
 'IDEAPAD3-G7-MX', 'lenovo-ideapad-3-gen7-mx',
 'Lenovo', 'IdeaPad 3 Gen 7', 'MX',
 'Intel Core i3-1215U', 8, 256, 'Intel UHD Graphics', 15.6,
 4.0, 'La laptop más asequible de Lenovo para tareas básicas: navegación, documentos y videoconferencias.',
 'https://www.lenovo.com/mx/es/p/laptops/ideapad/ideapad-300-series/ideapad-3-gen-7?aff=clicks_lenovo_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Lenovo IdeaPad 3 — Laptop económica para uso diario","seo_description":"Intel Core i3, 8GB RAM y diseño compacto. La solución ideal para presupuestos ajustados.","ui_accent_color":"#D97706"}'::jsonb),

-- 30. Dell Inspiron 14 5430 ── TRABAJO México (score 5.0)
((SELECT id FROM retailers WHERE slug='dell_mx' AND country_code='MX'),
 'INSPIRON14-5430-MX', 'dell-inspiron-14-5430-mx',
 'Dell', 'Inspiron 14 5430', 'MX',
 'Intel Core i5-1340P', 8, 512, 'Intel Iris Xe', 14.0,
 5.0, 'Compacta y eficiente con la última generación de Intel. Perfecta para trabajar desde cualquier lugar.',
 'https://www.dell.com/es-mx/shop/laptops/inspiron-14/spd/inspiron-14-5430-laptop?aff=clicks_dell_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"Dell Inspiron 14 — Compacta y poderosa para el trabajo","seo_description":"Intel Core i5 de última generación, 14 pulgadas y diseño ultradelgado para profesionales.","ui_accent_color":"#2563EB"}'::jsonb),

-- 31. HP Pavilion 14-ec1 ── MULTIMEDIA (score 6.5, descuento 15%)
((SELECT id FROM retailers WHERE slug='hp_mx' AND country_code='MX'),
 'HP-PAVILION14-EC1-MX', 'hp-pavilion-14-ec1-mx',
 'HP', 'Pavilion 14-ec1', 'MX',
 'AMD Ryzen 7 5825U', 16, 512, 'AMD Radeon', 14.0,
 6.5, 'AMD Ryzen 7 para multitarea sin límites. Pantalla IPS FHD ideal para contenido multimedia.',
 'https://www.hp.com/mx-es/shop/pdp/hp-pavilion-laptop-14-ec1?aff=clicks_hp_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"ultrabook","seo_title":"HP Pavilion 14 — Rendimiento AMD Ryzen 7 al mejor precio","seo_description":"AMD Ryzen 7, 16GB RAM y pantalla FHD. Excelente relación precio-rendimiento para México.","ai_badge":"MEJOR OFERTA","ui_accent_color":"#2563EB"}'::jsonb),

-- 32. Lenovo Yoga Slim 7 Pro ── PROFESIONAL CREATIVO (score 6.0)
((SELECT id FROM retailers WHERE slug='lenovo_mx' AND country_code='MX'),
 'YOGA-SLIM7PRO-MX', 'lenovo-yoga-slim-7-pro-mx',
 'Lenovo', 'Yoga Slim 7 Pro', 'MX',
 'AMD Ryzen 5 6600HS', 16, 512, 'AMD Radeon RX 6500M', 14.0,
 6.0, 'Elegancia y potencia en un diseño de apenas 1.4 kg. La laptop creativa más delgada de Lenovo.',
 'https://www.lenovo.com/mx/es/p/laptops/yoga/yoga-slim-series/yoga-slim-7-pro-gen-7?aff=clicks_lenovo_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"creator","seo_title":"Lenovo Yoga Slim 7 Pro — Creatividad sin peso","seo_description":"AMD Ryzen 5 con gráfica dedicada RX 6500M, pantalla 2.8K y solo 1.4 kg de peso.","ui_accent_color":"#7C3AED"}'::jsonb),

-- 33. Asus VivoBook 16X M1603 ── PANTALLA GRANDE MX (score 5.0)
((SELECT id FROM retailers WHERE slug='asus_mx' AND country_code='MX'),
 'VIVOBOOK16X-M1603-MX', 'asus-vivobook-16x-m1603-mx',
 'Asus', 'VivoBook 16X M1603QA', 'MX',
 'AMD Ryzen 5 5600H', 8, 512, 'AMD Radeon', 16.0,
 5.0, 'Pantalla de 16 pulgadas para los que necesitan espacio de trabajo amplio sin sacrificar movilidad.',
 'https://www.asus.com/mx/laptops/for-home/vivobook/asus-vivobook-16x-m1603/?aff=clicks_asus_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Asus VivoBook 16X — Pantalla grande, precio justo","seo_description":"16 pulgadas Full HD con AMD Ryzen 5 y batería de larga duración para trabajo y entretenimiento.","ui_accent_color":"#D97706"}'::jsonb),

-- 34. Dell Vostro 14 3430 ── PYME MÉXICO (score 5.0)
((SELECT id FROM retailers WHERE slug='dell_mx' AND country_code='MX'),
 'VOSTRO14-3430-MX', 'dell-vostro-14-3430-mx',
 'Dell', 'Vostro 14 3430', 'MX',
 'Intel Core i5-1335U', 8, 256, 'Intel Iris Xe', 14.0,
 5.0, 'Diseñada para pequeñas empresas mexicanas: soporte Dell ProSupport y gestión empresarial simplificada.',
 'https://www.dell.com/es-mx/shop/laptops/vostro-14-3430/spd/vostro-14-3430-laptop?aff=clicks_dell_mx',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"business","seo_title":"Dell Vostro 14 — Confiabilidad empresarial para PyMEs","seo_description":"Laptop Dell con soporte empresarial ProSupport, Intel Core i5 y diseño compacto de 14 pulgadas.","ui_accent_color":"#059669"}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  procesador=EXCLUDED.procesador, ram_gb=EXCLUDED.ram_gb, disco_gb=EXCLUDED.disco_gb,
  tarjeta_video=EXCLUDED.tarjeta_video, deal_score=EXCLUDED.deal_score,
  ai_reasoning=EXCLUDED.ai_reasoning, image_url=EXCLUDED.image_url,
  metadata_extra=EXCLUDED.metadata_extra, updated_at=CURRENT_TIMESTAMP;

-- ==============================================================================
-- BRAZIL (BRL — tipo de cambio ~5.2 por USD)
-- ==============================================================================
INSERT INTO laptops (retailer_id, sku_original, slug, marca, modelo, country_code,
  procesador, ram_gb, disco_gb, tarjeta_video, display_inches,
  deal_score, ai_reasoning, url_afiliado, image_url, metadata_extra)
VALUES

-- 35. Dell Inspiron 15 3511 ── CUSTO-BENEFÍCIO BR (score 5.5, descuento 19%)
((SELECT id FROM retailers WHERE slug='dell_br' AND country_code='BR'),
 'INSPIRON15-3511-BR', 'dell-inspiron-15-3511-br',
 'Dell', 'Inspiron 15 3511', 'BR',
 'Intel Core i5-1135G7', 8, 256, 'Intel Iris Xe', 15.6,
 5.5, 'A laptop mais vendida da Dell no Brasil. Excelente custo-benefício com garantia de 1 ano no país.',
 'https://www.dell.com/pt-br/shop/laptops/inspiron-15-3511/spd/inspiron-15-3511-laptop?aff=clicks_dell_br',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Dell Inspiron 15 — Melhor custo-benefício para o Brasil","seo_description":"Intel Core i5, 8GB RAM e garantia Dell no Brasil. O notebook mais popular por uma boa razão.","ai_badge":"MELHOR PREÇO","ui_accent_color":"#D97706"}'::jsonb),

-- 36. Lenovo IdeaPad 3i Gen 7 ── BÁSICO BR (score 5.0)
((SELECT id FROM retailers WHERE slug='lenovo_br' AND country_code='BR'),
 'IDEAPAD3I-G7-BR', 'lenovo-ideapad-3i-gen7-br',
 'Lenovo', 'IdeaPad 3i Gen 7', 'BR',
 'Intel Core i5-12450H', 8, 512, 'Intel UHD Graphics', 15.6,
 5.0, 'Confiável e eficiente para trabalho e estudo. Intel Core i5 de 12ª geração com ótima duração de bateria.',
 'https://www.lenovo.com/br/pt/p/laptops/ideapad/ideapad-300-series/ideapad-3i-gen-7?aff=clicks_lenovo_br',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Lenovo IdeaPad 3i — Notebook para trabalho e estudo","seo_description":"Intel Core i5 12ª geração, 8GB RAM e SSD 512GB. O básico que funciona muito bem.","ui_accent_color":"#D97706"}'::jsonb),

-- 37. HP Pavilion 15-eg ── MULTIMÍDIA BR (score 5.0)
((SELECT id FROM retailers WHERE slug='hp_br' AND country_code='BR'),
 'HP-PAV15-EG-BR', 'hp-pavilion-15-eg-br',
 'HP', 'Pavilion 15-eg3', 'BR',
 'Intel Core i5-1335U', 8, 512, 'Intel Iris Xe', 15.6,
 5.0, 'Design elegante e tela Full HD ampla para entretenimento. A escolha certa para quem quer qualidade HP.',
 'https://www.hp.com/br-pt/shop/pdp/hp-pavilion-laptop-15-eg3?aff=clicks_hp_br',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"HP Pavilion 15 — Qualidade HP no Brasil","seo_description":"Design moderno, tela Full HD 15.6 polegadas e Intel Core i5. Confiança HP ao seu alcance.","ui_accent_color":"#D97706"}'::jsonb),

-- 38. Acer Aspire 5 A515 ── PREÇO ACESSÍVEL BR (score 5.5, descuento 17%)
((SELECT id FROM retailers WHERE slug='acer_br' AND country_code='BR'),
 'ASPIRE5-A515-57-BR', 'acer-aspire-5-a515-57-br',
 'Acer', 'Aspire 5 A515-57', 'BR',
 'Intel Core i5-12450H', 8, 512, 'Intel Iris Xe', 15.6,
 5.5, 'Desempenho sólido a um preço justo. A Aspire 5 é referência em custo-benefício no mercado brasileiro.',
 'https://www.acer.com/br-pt/laptops/aspire/aspire-5/pdp/NX.K3QAL.001?aff=clicks_acer_br',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Acer Aspire 5 — Custo-benefício imbatível no Brasil","seo_description":"Intel Core i5 12ª geração e SSD 512GB por um preço acessível. Referência em custo-benefício.","ai_badge":"MELHOR OFERTA","ui_accent_color":"#D97706"}'::jsonb),

-- 39. Asus VivoBook 16X M1603 BR ── TELA GRANDE BR (score 5.0)
((SELECT id FROM retailers WHERE slug='asus_br' AND country_code='BR'),
 'VIVOBOOK16X-M1603-BR', 'asus-vivobook-16x-m1603-br',
 'Asus', 'VivoBook 16X M1603QA', 'BR',
 'AMD Ryzen 5 5600H', 8, 512, 'AMD Radeon', 16.0,
 5.0, 'Tela widescreen de 16 polegadas para quem precisa de espaço de trabalho amplo a um preço justo.',
 'https://www.asus.com/br/laptops/for-home/vivobook/asus-vivobook-16x-m1603/?aff=clicks_asus_br',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"budget","seo_title":"Asus VivoBook 16X — Tela ampla para trabalho e lazer","seo_description":"AMD Ryzen 5, tela de 16 polegadas Full HD e bateria duradoura. Perfeito para trabalho e entretenimento.","ui_accent_color":"#D97706"}'::jsonb),

-- 40. Lenovo LOQ 15APH8 ── GAMING BR (score 7.5)
((SELECT id FROM retailers WHERE slug='lenovo_br' AND country_code='BR'),
 'LOQ15-APH8-BR', 'lenovo-loq-15aph8-br',
 'Lenovo', 'LOQ 15APH8', 'BR',
 'AMD Ryzen 7 7745HX', 16, 512, 'NVIDIA RTX 4060 8GB', 15.6,
 7.5, 'Gaming sério a preço justo. A linha LOQ traz RTX 4060 e Ryzen 7 para o mercado brasileiro.',
 'https://www.lenovo.com/br/pt/p/laptops/ideapad/ideapad-gaming-laptops/lenovo-loq-15aph8?aff=clicks_lenovo_br',
 NULL,  -- sin foto real verificada (ver migration_real_images_v6.sql)
 '{"condition":"new","category":"gaming","seo_title":"Lenovo LOQ 15 — Gaming com RTX 4060 no Brasil","seo_description":"Ryzen 7 7745HX, RTX 4060 e tela Full HD 144Hz. O melhor custo-benefício em gaming do Brasil.","ai_badge":"GAMING PRO","ui_accent_color":"#DC2626"}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  procesador=EXCLUDED.procesador, ram_gb=EXCLUDED.ram_gb, disco_gb=EXCLUDED.disco_gb,
  tarjeta_video=EXCLUDED.tarjeta_video, deal_score=EXCLUDED.deal_score,
  ai_reasoning=EXCLUDED.ai_reasoning, image_url=EXCLUDED.image_url,
  metadata_extra=EXCLUDED.metadata_extra, updated_at=CURRENT_TIMESTAMP;

-- ==============================================================================
-- PRICE HISTORIES — Un registro inicial para cada laptop nueva
-- Solo inserta si no existe precio reciente (evita duplicados en re-ejecuciones)
-- ==============================================================================
INSERT INTO price_histories (laptop_id, precio_actual, precio_original, moneda, tipo_cambio_aplicado, es_oferta_destacada)
SELECT l.id,
  CASE l.slug
    -- Argentina (ARS)
    WHEN 'lenovo-legion-pro-7i-gen9-ar'      THEN 2899000 WHEN 'lenovo-ideapad-slim-5-gen9-ar'     THEN 849000
    WHEN 'hp-pavilion-15-eg3-ar'             THEN 649000  WHEN 'hp-envy-x360-14-ar'                THEN 1099000
    WHEN 'dell-xps-13-9340-ar'               THEN 1699000 WHEN 'dell-vostro-15-3525-ar'            THEN 549000
    WHEN 'asus-rog-strix-g16-g614jv-ar'      THEN 2149000 WHEN 'asus-vivobook-15-x1504za-ar'       THEN 579000
    WHEN 'apple-macbook-air-m2-13-ar'        THEN 1449000 WHEN 'msi-katana-15-b12vek-ar'           THEN 1349000
    -- United States (USD)
    WHEN 'dell-xps-15-9530-us'               THEN 2099    WHEN 'hp-spectre-x360-14-us'             THEN 1299
    WHEN 'lenovo-thinkpad-x1-carbon-gen11-us'THEN 1499    WHEN 'asus-rog-zephyrus-g14-ga402xv-us'  THEN 1699
    WHEN 'msi-raider-ge78-hx-us'             THEN 2999    WHEN 'razer-blade-15-2023-us'            THEN 2399
    WHEN 'apple-macbook-pro-16-m3-max-us'    THEN 3499    WHEN 'acer-predator-helios-300-ph315-us'  THEN 999
    WHEN 'lenovo-ideapad-gaming-3-gen7-us'   THEN 649     WHEN 'hp-victus-16-e1-us'                THEN 699
    -- Spain (EUR)
    WHEN 'hp-pavilion-plus-14-es'            THEN 949     WHEN 'lenovo-ideapad-5-pro-14-es'        THEN 999
    WHEN 'dell-latitude-5540-es'             THEN 1199    WHEN 'asus-zenbook-14-oled-es'           THEN 1099
    WHEN 'hp-elitebook-840-g10-es'           THEN 1399    WHEN 'lenovo-thinkpad-e14-gen5-es'       THEN 799
    WHEN 'dell-xps-13-plus-9320-es'          THEN 1499
    -- Mexico (MXN)
    WHEN 'hp-laptop-15s-fq5-mx'             THEN 12499   WHEN 'lenovo-ideapad-3-gen7-mx'          THEN 9499
    WHEN 'dell-inspiron-14-5430-mx'          THEN 13999   WHEN 'hp-pavilion-14-ec1-mx'             THEN 16999
    WHEN 'lenovo-yoga-slim-7-pro-mx'         THEN 18499   WHEN 'asus-vivobook-16x-m1603-mx'        THEN 12999
    WHEN 'dell-vostro-14-3430-mx'            THEN 11499
    -- Brazil (BRL)
    WHEN 'dell-inspiron-15-3511-br'          THEN 3499    WHEN 'lenovo-ideapad-3i-gen7-br'         THEN 3199
    WHEN 'hp-pavilion-15-eg-br'              THEN 3799    WHEN 'acer-aspire-5-a515-57-br'          THEN 2899
    WHEN 'asus-vivobook-16x-m1603-br'        THEN 3999    WHEN 'lenovo-loq-15aph8-br'              THEN 6499
    ELSE 999
  END AS precio_actual,
  CASE l.slug
    WHEN 'lenovo-legion-pro-7i-gen9-ar'      THEN 3299000 WHEN 'hp-envy-x360-14-ar'               THEN 1299000
    WHEN 'dell-vostro-15-3525-ar'            THEN 679000  WHEN 'asus-rog-strix-g16-g614jv-ar'     THEN 2399000
    WHEN 'msi-katana-15-b12vek-ar'           THEN 1549000
    WHEN 'dell-xps-15-9530-us'               THEN 2499    WHEN 'asus-rog-zephyrus-g14-ga402xv-us'  THEN 1999
    WHEN 'msi-raider-ge78-hx-us'             THEN 3499    WHEN 'acer-predator-helios-300-ph315-us' THEN 1299
    WHEN 'hp-victus-16-e1-us'               THEN 849
    WHEN 'hp-pavilion-plus-14-es'            THEN 1099    WHEN 'lenovo-ideapad-5-pro-14-es'        THEN 1199
    WHEN 'asus-zenbook-14-oled-es'           THEN 1299
    WHEN 'hp-laptop-15s-fq5-mx'             THEN 14999   WHEN 'hp-pavilion-14-ec1-mx'             THEN 19999
    WHEN 'dell-inspiron-15-3511-br'          THEN 4299    WHEN 'acer-aspire-5-a515-57-br'          THEN 3499
    ELSE NULL
  END AS precio_original,
  CASE
    WHEN l.country_code = 'AR' THEN 'ARS'::currency_type
    WHEN l.country_code = 'US' THEN 'USD'::currency_type
    WHEN l.country_code = 'ES' THEN 'EUR'::currency_type
    WHEN l.country_code = 'MX' THEN 'MXN'::currency_type
    WHEN l.country_code = 'BR' THEN 'BRL'::currency_type
    ELSE 'USD'::currency_type
  END AS moneda,
  CASE
    WHEN l.country_code = 'AR' THEN 1450.00
    WHEN l.country_code = 'US' THEN 1.00
    WHEN l.country_code = 'ES' THEN 0.92
    WHEN l.country_code = 'MX' THEN 17.50
    WHEN l.country_code = 'BR' THEN 5.20
    ELSE 1.00
  END AS tipo_cambio_aplicado,
  (l.deal_score >= 8.5) AS es_oferta_destacada
FROM laptops l
WHERE l.slug IN (
  'lenovo-legion-pro-7i-gen9-ar','lenovo-ideapad-slim-5-gen9-ar','hp-pavilion-15-eg3-ar',
  'hp-envy-x360-14-ar','dell-xps-13-9340-ar','dell-vostro-15-3525-ar',
  'asus-rog-strix-g16-g614jv-ar','asus-vivobook-15-x1504za-ar','apple-macbook-air-m2-13-ar',
  'msi-katana-15-b12vek-ar',
  'dell-xps-15-9530-us','hp-spectre-x360-14-us','lenovo-thinkpad-x1-carbon-gen11-us',
  'asus-rog-zephyrus-g14-ga402xv-us','msi-raider-ge78-hx-us','razer-blade-15-2023-us',
  'apple-macbook-pro-16-m3-max-us','acer-predator-helios-300-ph315-us',
  'lenovo-ideapad-gaming-3-gen7-us','hp-victus-16-e1-us',
  'hp-pavilion-plus-14-es','lenovo-ideapad-5-pro-14-es','dell-latitude-5540-es',
  'asus-zenbook-14-oled-es','hp-elitebook-840-g10-es','lenovo-thinkpad-e14-gen5-es',
  'dell-xps-13-plus-9320-es',
  'hp-laptop-15s-fq5-mx','lenovo-ideapad-3-gen7-mx','dell-inspiron-14-5430-mx',
  'hp-pavilion-14-ec1-mx','lenovo-yoga-slim-7-pro-mx','asus-vivobook-16x-m1603-mx',
  'dell-vostro-14-3430-mx',
  'dell-inspiron-15-3511-br','lenovo-ideapad-3i-gen7-br','hp-pavilion-15-eg-br',
  'acer-aspire-5-a515-57-br','asus-vivobook-16x-m1603-br','lenovo-loq-15aph8-br'
)
AND NOT EXISTS (
  SELECT 1 FROM price_histories ph
  WHERE ph.laptop_id = l.id
  AND ph.recorded_at > NOW() - INTERVAL '1 day'
);

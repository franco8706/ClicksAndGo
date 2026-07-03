-- =========================================================
-- 📡 SEMILLAS DE NOTICIAS (hardware_news)
-- Radar de Inteligencia geolocalizado.
--   country_code IS NULL  -> noticia GLOBAL (se muestra en todos los países)
--   country_code = 'XX'   -> noticia REGIONAL (solo ese país)
-- El endpoint sirve: WHERE country_code = <pais> OR country_code IS NULL
-- Idempotente: ON CONFLICT (title) DO NOTHING.
-- =========================================================

INSERT INTO hardware_news (category, title, summary, impact_score, country_code, recorded_at) VALUES

-- ── 🌍 GLOBALES (todos los países) ───────────────────────────────
('NVIDIA', 'NVIDIA RTX 50 Series llega a las laptops gaming',
 'La nueva generación Blackwell móvil promete hasta 40% más de rendimiento por vatio. Los primeros modelos con RTX 5080 y 5090 Laptop ya aparecen en el catálogo de las principales marcas.',
 'CRITICAL', NULL, NOW() - INTERVAL '2 hours'),

('AI', 'Los NPU se vuelven estándar: qué es una laptop "Copilot+"',
 'Intel Lunar Lake, AMD Ryzen AI y Snapdragon X Elite integran unidades neuronales de +40 TOPS. Te explicamos si realmente necesitás una para tu próxima compra.',
 'HIGH', NULL, NOW() - INTERVAL '6 hours'),

('CPU', 'AMD Ryzen AI 300 vs Intel Core Ultra 200: la batalla 2025',
 'Comparamos autonomía, potencia y precio de las dos plataformas que dominan el mercado de ultrabooks este año. El ganador depende de tu uso.',
 'HIGH', NULL, NOW() - INTERVAL '1 day'),

('MERCADO', 'Los SSD PCIe 5.0 bajan de precio un 25%',
 'La caída en el costo de la memoria NAND se traslada al consumidor. Buen momento para buscar laptops con almacenamiento ultrarrápido de última generación.',
 'MEDIUM', NULL, NOW() - INTERVAL '2 days'),

('APPLE', 'MacBook con chip M4: rendimiento récord en tareas de IA',
 'El nuevo Neural Engine acelera modelos locales de forma notable. Analizamos si justifica el salto frente a los modelos M3 que aún se consiguen con descuento.',
 'MEDIUM', NULL, NOW() - INTERVAL '3 days'),

-- ── 🇦🇷 ARGENTINA ────────────────────────────────────────────────
('MERCADO', 'Baja de aranceles: las laptops importadas se abaratan en Argentina',
 'La reducción de impuestos a la importación de electrónica empieza a reflejarse en los precios de MercadoLibre. Detectamos caídas de hasta 15% en modelos gaming.',
 'CRITICAL', 'AR', NOW() - INTERVAL '4 hours'),

('OFERTA', 'HOT SALE Argentina: las mejores notebooks en cuotas sin interés',
 'Bancos y tiendas oficiales lanzan hasta 12 cuotas sin interés. Nuestro radar rastrea qué modelos realmente bajaron de precio y cuáles inflaron antes de "descontar".',
 'HIGH', 'AR', NOW() - INTERVAL '1 day'),

('PRECIO', 'Dólar y tecnología: cuándo conviene comprar tu laptop',
 'El tipo de cambio aplicado impacta directo en el precio final. Analizamos la tendencia para ayudarte a elegir el mejor momento de compra en pesos.',
 'MEDIUM', 'AR', NOW() - INTERVAL '2 days'),

-- ── 🇪🇸 ESPAÑA ────────────────────────────────────────────────────
('MERCADO', 'Amazon España adelanta ofertas de vuelta al cole en portátiles',
 'Los descuentos en ultrabooks para estudiantes ya están activos. Comparamos precios reales frente al histórico para detectar las gangas verdaderas.',
 'HIGH', 'ES', NOW() - INTERVAL '5 hours'),

('OFERTA', 'Días sin IVA en tecnología: qué portátiles merecen la pena',
 'Varias cadenas aplican el equivalente al 21% de descuento. Nuestro motor filtra las ofertas con mejor relación calidad-precio del momento.',
 'HIGH', 'ES', NOW() - INTERVAL '1 day'),

('CPU', 'Portátiles con Snapdragon X: autonomía de récord para teletrabajo',
 'Los nuevos equipos ARM con Windows llegan a España prometiendo más de 20 horas de batería. Analizamos su compatibilidad con el software de oficina.',
 'MEDIUM', 'ES', NOW() - INTERVAL '2 days'),

-- ── 🇺🇸 ESTADOS UNIDOS ────────────────────────────────────────────
('MERCADO', 'Back to School deals: best student laptops under $1000',
 'Retailers slash prices on ultrabooks ahead of the school season. Our engine tracks genuine price drops versus inflated "discounts" across major US stores.',
 'HIGH', 'US', NOW() - INTERVAL '3 hours'),

('GPU', 'RTX 5090 Laptop benchmarks: is the premium worth it?',
 'We break down real-world gaming and creator performance of the flagship mobile GPU. Spoiler: for most users, the RTX 5070 hits the sweet spot.',
 'HIGH', 'US', NOW() - INTERVAL '1 day'),

('OFERTA', 'Prime Day preview: which laptops will actually go on sale',
 'Based on historical pricing data, we predict which models are most likely to see real discounts — and which to skip.',
 'MEDIUM', 'US', NOW() - INTERVAL '2 days'),

-- ── 🇲🇽 MÉXICO ─────────────────────────────────────────────────────
('OFERTA', 'El Buen Fin: guía de las mejores laptops a meses sin intereses',
 'Rastreamos qué modelos ofrecen descuentos reales durante la temporada de ofertas más grande de México, evitando los precios inflados.',
 'HIGH', 'MX', NOW() - INTERVAL '6 hours'),

('MERCADO', 'MercadoLibre México: las notebooks gaming más buscadas',
 'El interés por equipos con RTX crece en el país. Analizamos disponibilidad y precios frente a otras tiendas oficiales.',
 'MEDIUM', 'MX', NOW() - INTERVAL '2 days'),

-- ── 🇧🇷 BRASIL ─────────────────────────────────────────────────────
('MERCADO', 'Notebooks gamer em promoção no Brasil: o que vale a pena',
 'A concorrência entre lojas derruba os preços de modelos com RTX. Nosso radar identifica as ofertas com maior desconto real do mês.',
 'HIGH', 'BR', NOW() - INTERVAL '5 hours'),

('OFERTA', 'Semana do Consumidor: os melhores preços em ultrabooks',
 'Comparamos os descontos das principais varejistas brasileiras para separar as promoções verdadeiras das maquiadas.',
 'MEDIUM', 'BR', NOW() - INTERVAL '2 days')

ON CONFLICT (title) DO NOTHING;

-- =============================================================================
-- 📦 MIGRACIÓN v8 — Taxonomía de catálogo completo + escala
--
-- POR QUÉ: el catálogo pasó de 70 productos curados a la ingesta del catálogo
-- digital completo de los retailers afiliados (Newegg solo expone ~693.000
-- productos, de los que la taxonomía clasifica el 98,8%). Los 9 tipos que
-- había cubrían "notebooks y algunos periféricos"; no alcanzan para navegar
-- decenas de miles de items que incluyen RAM, SSD, routers, UPS y repuestos.
--
-- CÓMO: NO agrega columnas. Usa el mecanismo que `product_categories` ya
-- traía diseñado para esto — su propio comentario dice "sumar un tipo nuevo =
-- INSERT en esta tabla (no ALTER TYPE, no CHECK que reescribir, no
-- downtime)". Entonces:
--     laptops.product_type      → la SUBCATEGORÍA (el tipo concreto)
--     product_categories.family → la CATEGORÍA (navegación macro)
-- La FK `fk_laptops_product_type` sigue garantizando que no entre un tipo
-- inventado, sin necesidad de un CHECK duplicado que mantener.
--
-- SIN MIGRACIÓN DE DATOS: los 9 códigos que ya existían conservan su nombre
-- exacto ('laptop', 'monitor', 'supplies'…), así ninguna fila cambia y el DTO
-- público no rompe. Solo se corrigen dos `family` mal ubicadas.
--
-- FUENTE: generado desde Python/src/agents/taxonomy.py — si se agrega una
-- subcategoría allá, regenerar esto. Los valores no se escriben a mano.
--
-- IDEMPOTENTE: se puede correr varias veces.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. TAXONOMÍA COMPLETA (56 subcategorías en 9 categorías)
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO product_categories (code, family, label) VALUES
  ('laptop', 'computing', 'Laptops'),
  ('desktop', 'computing', 'PC de escritorio'),
  ('tablets', 'computing', 'Tablets'),
  ('servers', 'computing', 'Servidores'),
  ('workstations', 'computing', 'Workstations'),
  ('monitor', 'displays', 'Monitores'),
  ('projectors', 'displays', 'Proyectores'),
  ('tv', 'displays', 'Televisores'),
  ('cpu', 'components', 'Procesadores'),
  ('gpu', 'components', 'Placas de video'),
  ('ram', 'components', 'Memoria RAM'),
  ('motherboards', 'components', 'Motherboards'),
  ('power_supplies', 'components', 'Fuentes de poder'),
  ('cooling', 'components', 'Refrigeración'),
  ('cases', 'components', 'Gabinetes'),
  ('sound_cards', 'components', 'Placas de sonido'),
  ('capture_cards', 'components', 'Capturadoras'),
  ('ssd', 'storage', 'Discos SSD'),
  ('hdd', 'storage', 'Discos rígidos'),
  ('external_drives', 'storage', 'Discos externos'),
  ('usb_flash', 'storage', 'Pendrives'),
  ('nas', 'storage', 'Almacenamiento en red'),
  ('memory_cards', 'storage', 'Tarjetas de memoria'),
  ('optical_drives', 'storage', 'Lectoras ópticas'),
  ('keyboard', 'peripherals', 'Teclados'),
  ('mouse', 'peripherals', 'Mouse'),
  ('headphones', 'peripherals', 'Auriculares'),
  ('speakers', 'peripherals', 'Parlantes'),
  ('microphones', 'peripherals', 'Micrófonos'),
  ('webcam', 'peripherals', 'Webcams'),
  ('gamepads', 'peripherals', 'Joysticks'),
  ('mousepads', 'peripherals', 'Mousepads'),
  ('routers', 'networking', 'Routers'),
  ('switches', 'networking', 'Switches de red'),
  ('network_cards', 'networking', 'Placas de red'),
  ('range_extenders', 'networking', 'Repetidores WiFi'),
  ('modems', 'networking', 'Módems'),
  ('cables_network', 'networking', 'Cables de red'),
  ('printer', 'printing', 'Impresoras'),
  ('scanners', 'printing', 'Escáneres'),
  ('supplies', 'printing', 'Insumos de impresión'),
  ('printer_parts', 'printing', 'Repuestos de impresión'),
  ('paper_media', 'printing', 'Papel y medios'),
  ('ups', 'power', 'UPS'),
  ('surge_protectors', 'power', 'Protectores de tensión'),
  ('batteries', 'power', 'Baterías'),
  ('chargers', 'power', 'Cargadores'),
  ('cables_power', 'power', 'Cables y alimentación'),
  ('docking_stations', 'accessories', 'Docking stations'),
  ('kvm', 'accessories', 'Switches KVM'),
  ('mounts_stands', 'accessories', 'Soportes'),
  ('bags_cases', 'accessories', 'Fundas y mochilas'),
  ('laptop_parts', 'accessories', 'Repuestos de notebook'),
  ('adapters', 'accessories', 'Adaptadores'),
  ('cleaning', 'accessories', 'Limpieza'),
  ('other_accessories', 'accessories', 'Otros accesorios')
ON CONFLICT (code) DO UPDATE
  SET family = EXCLUDED.family,
      label  = EXCLUDED.label;

-- `monitor` estaba en 'computing' y pasa a 'displays' (ahora convive con
-- proyectores y TV); el resto de los 9 originales mantiene su familia. El
-- ON CONFLICT de arriba ya lo aplica — queda anotado porque es el único
-- cambio de navegación visible para un producto que ya existía.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. ÍNDICES DE ESCALA
--
-- El catálogo pasa de 70 filas (donde cualquier plan sirve) a decenas de
-- miles. Están pensados para PAGINAR, que es lo que hace el sitio: filtrar
-- por país + tipo y traer la página N ordenada.
--
-- Cada uno incluye la columna de orden (`id`) al final. Sin eso Postgres
-- filtra por índice pero después ordena en memoria, y una página profunda
-- se convierte en un sort de la tabla entera.
-- ─────────────────────────────────────────────────────────────────────────

-- Listado del país sin filtro (home)
CREATE INDEX IF NOT EXISTS idx_laptops_country_id
    ON laptops (country_code, id);

-- Navegación por subcategoría — el caso más común del menú
CREATE INDEX IF NOT EXISTS idx_laptops_country_type_id
    ON laptops (country_code, product_type, id);

-- Conteos del árbol de navegación (cuántos productos tiene cada rama).
-- Índice de cobertura: el COUNT se resuelve sin tocar la tabla.
CREATE INDEX IF NOT EXISTS idx_laptops_type_counts
    ON laptops (country_code, product_type);

-- El sitemap ordena por updated_at y no tenía índice: con 70 filas daba
-- igual, con 50.000 es un sort completo en cada regeneración.
CREATE INDEX IF NOT EXISTS idx_laptops_updated_at
    ON laptops (updated_at DESC);

-- Filtrar por CATEGORÍA (familia) es un semi-join contra product_categories.
-- Esa tabla tiene 56 filas y entra entera en memoria, así que el join
-- es despreciable; lo que hay que indexar es la búsqueda por familia.
CREATE INDEX IF NOT EXISTS idx_product_categories_family
    ON product_categories (family, code);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. ESTADÍSTICAS Y MAPA DE VISIBILIDAD
--
-- `VACUUM` y no solo `ANALYZE`. Medido con 100.000 productos reales:
--
--   consulta del árbol de categorías   solo ANALYZE → 23,4 ms
--                                      tras VACUUM  →  4,0 ms
--
-- La diferencia es que `idx_laptops_type_counts` es un índice de COBERTURA:
-- puede resolver el COUNT sin tocar la tabla, pero Postgres solo se permite
-- ese atajo (Index Only Scan) si el mapa de visibilidad está al día. Con el
-- mapa sucio elige un Bitmap Heap Scan y lee 3.216 bloques de más.
--
-- ⚠️ Esto vuelve a pasar DESPUÉS DE CADA INGESTA MASIVA: al insertar decenas
-- de miles de filas el mapa queda sucio otra vez y el árbol de categorías
-- —que se pinta en todas las páginas del sitio— se vuelve 6× más lento hasta
-- que corre el autovacuum. Por eso el pipeline de ingesta debe cerrar con un
-- VACUUM ANALYZE, no confiar en el autovacuum.
-- ─────────────────────────────────────────────────────────────────────────
VACUUM ANALYZE laptops;
ANALYZE product_categories;

-- =====================================================================
-- CLICKS & GO — News source_url v7 (cierre de drift de esquema)
-- Ejecutar DESPUÉS de migration_real_images_v6.sql. Idempotente.
--
-- POR QUÉ EXISTE
-- Detectado el 2026-07-30 al montar la suite de tests de Rails: la columna
-- `hardware_news.source_url` **existe en producción pero NO en los .sql del
-- repositorio**. Se agregó a mano en algún momento, sin archivo de migración.
--
-- El síntoma era invisible: `notebooks#hardware_news` la incluye en su SELECT,
-- así que sobre una base reconstruida desde el repo la query lanza
-- `PG::UndefinedColumn` — y el `rescue StandardError` del controller lo
-- convierte en `render json: [], status: :ok`. O sea: el sitio se quedaría
-- SIN NOTICIAS y devolviendo 200, sin error visible en ninguna parte.
--
-- Consecuencia real: hasta esta migración, el esquema del repo **no era
-- reproducible**. Un restore desde cero (recuperación ante desastre, o el
-- alta de un entorno nuevo) habría producido una base sutilmente distinta a
-- la de producción. Los backups guardan los datos; esto guarda la estructura.
--
-- Comparación completa prod↔repo hecha en la misma sesión: este era el ÚNICO
-- drift de columnas (94 en prod vs 98 en el repo, siendo la diferencia estas
-- 5 filas de bookkeeping de Rails: `schema_migrations` y `ar_internal_metadata`).
-- =====================================================================

BEGIN;

-- `source_url` guarda el enlace al artículo original del feed RSS. El
-- frontend lo expone como `sourceUrl` y lo usa para que la tarjeta de noticia
-- sea clickeable hacia la fuente.
ALTER TABLE hardware_news ADD COLUMN IF NOT EXISTS source_url TEXT;

DO $$
DECLARE existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_news' AND column_name = 'source_url'
  ) INTO existe;

  IF existe THEN
    RAISE NOTICE 'hardware_news.source_url presente — esquema alineado con producción.';
  ELSE
    RAISE EXCEPTION 'hardware_news.source_url NO se creó: revisar permisos.';
  END IF;
END $$;

COMMIT;

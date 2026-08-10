import type { MetadataRoute } from "next";

/**
 * Sitemap del catálogo global.
 *
 * ⚠️ CONTRATO DE FALLO: esta función **no puede lanzar nunca**. Si lanza,
 * Next devuelve 500 en `/sitemap.xml` y Google deja de descubrir páginas
 * (y ante errores repetidos degrada el rate de rastreo del dominio). Por eso
 * todo lo que toca la red está aislado y el peor caso posible es servir solo
 * las rutas estáticas — un sitemap reducido, nunca uno roto.
 *
 * Fuente de productos: `GET /api/v1/notebooks/sitemap` (Rails), que devuelve
 * `{slug, updated_at}` de TODO el catálogo. No se usa `/notebooks?country=`
 * porque filtra por país y clampea a 100 filas: con el catálogo creciendo,
 * ese endpoint perdería productos en silencio.
 */

/**
 * Se renderiza por request, no en build.
 *
 * Sin esto Next prerenderiza el sitemap durante `next build`, donde Rails NO
 * es alcanzable (build de Docker aislado) → el fetch falla, cae al catch, y
 * queda **cacheado un sitemap sin productos** hasta la primera revalidación.
 * O sea: cada deploy dejaba el sitemap vacío por una hora. Detectado al ver
 * `○ /sitemap.xml  Revalidate 1h` en la salida del build.
 *
 * El costo de servirlo dinámico es nulo: Rails cachea `products/sitemap` una
 * hora por su cuenta (`Rails.cache.fetch`), así que la carga real es un hit
 * de caché, no una query. La protección del backend no depende del modo de
 * render de Next.
 */
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://clicks-web-2myrvivvhq-uc.a.run.app"
).replace(/\/$/, "");

const LOCALES = ["es", "en", "pt", "it"] as const;
const DEFAULT_LOCALE = "es";
/** Idioma servido a quien no matchea ningún locale (espeja el proxy). */
const X_DEFAULT_LOCALE = "en";

// Solo páginas públicas indexables. login/register/panel quedan fuera (privadas).
// "" = home. Cada una existe en los 4 idiomas.
const PUBLIC_PATHS = [
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  { path: "/privacidad", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/terminos", changeFrequency: "monthly" as const, priority: 0.5 },
];

/**
 * Tope del protocolo sitemap: 50.000 URLs por archivo. Cada producto emite
 * una URL por idioma, así que el techo real de productos es 50.000/4 menos
 * las rutas estáticas. Si alguna vez se alcanza, la solución NO es subir el
 * número sino partir en sitemap index con `generateSitemaps()` de Next.
 */
const MAX_SITEMAP_URLS = 50_000;

/** Timeout de la llamada a Rails. Google reintenta; colgarse no es opción. */
const RAILS_TIMEOUT_MS = 8_000;

/**
 * Slugs aceptables. Un slug con caracteres raros rompería el XML o generaría
 * una URL inválida que Google reporta como error de rastreo. Se valida en vez
 * de escapar: el pipeline ya genera slugs kebab-case, así que cualquier cosa
 * fuera de este patrón es un dato corrupto y se descarta.
 */
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface SitemapProduct {
  readonly slug: string;
  readonly lastModified: Date;
}

/** Mapa hreflang compartido por las variantes de idioma de una misma página. */
function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    LOCALES.map((loc) => [loc, `${SITE_URL}/${loc}${path}`])
  );
  languages["x-default"] = `${SITE_URL}/${X_DEFAULT_LOCALE}${path}`;
  return languages;
}

/**
 * Trae el catálogo de Rails. Devuelve [] ante CUALQUIER problema — red caída,
 * timeout, JSON inválido, payload con forma inesperada. Nunca lanza.
 */
async function fetchProducts(): Promise<SitemapProduct[]> {
  const railsApiUrl = process.env.RAILS_API_URL || "http://rails_backend:3000";

  try {
    const res = await fetch(`${railsApiUrl}/api/v1/notebooks/sitemap`, {
      signal: AbortSignal.timeout(RAILS_TIMEOUT_MS),
      // Se revalida cada hora: Google no necesita el sitemap al segundo, y
      // así un pico de rastreo no se traduce en un pico de carga a Rails.
      next: { revalidate: 3600, tags: ["sitemap"] },
    });
    if (!res.ok) {
      console.error(`[sitemap] Rails respondió ${res.status} — se sirven solo las rutas estáticas.`);
      return [];
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) {
      console.error("[sitemap] Payload de Rails no es un array — se sirven solo las rutas estáticas.");
      return [];
    }

    // Se valida fila por fila en vez de confiar en el tipo: un solo slug
    // corrupto no puede tumbar el sitemap entero.
    const seen = new Set<string>();
    const products: SitemapProduct[] = [];

    for (const row of data) {
      if (typeof row !== "object" || row === null) continue;
      const { slug, updated_at: updatedAt } = row as Record<string, unknown>;

      if (typeof slug !== "string" || !SAFE_SLUG.test(slug)) continue;
      if (seen.has(slug)) continue; // el mismo producto no puede repetirse
      seen.add(slug);

      const parsed = typeof updatedAt === "string" ? new Date(updatedAt) : null;
      const lastModified =
        parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();

      products.push({ slug, lastModified });
    }

    return products;
  } catch (err) {
    console.error("[sitemap] No se pudo leer el catálogo de Rails:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // ── 1. Rutas estáticas: siempre presentes, pase lo que pase ──────────────
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_PATHS.flatMap(
    ({ path, changeFrequency, priority }) => {
      const languages = languageAlternates(path);

      return LOCALES.map((loc) => ({
        url: `${SITE_URL}/${loc}${path}`,
        lastModified,
        changeFrequency,
        // La variante en idioma por defecto pesa un poco más que sus traducciones.
        priority: loc === DEFAULT_LOCALE ? priority : Math.max(priority - 0.1, 0.1),
        alternates: { languages },
      }));
    }
  );

  // ── 2. Páginas de producto ───────────────────────────────────────────────
  // Verificado en producción (2026-07-28) que `/{locale}/laptop/{slug}` responde
  // 200 en los 4 idiomas: la página busca por slug y traduce con el diccionario
  // del locale, así que cada producto existe genuinamente en los 4 → el hreflang
  // es correcto y no una equivalencia inventada.
  const products = await fetchProducts();

  // Espacio que queda para productos respetando el tope del protocolo.
  const budget = Math.max(MAX_SITEMAP_URLS - staticEntries.length, 0);
  const maxProducts = Math.floor(budget / LOCALES.length);

  if (products.length > maxProducts) {
    console.error(
      `[sitemap] ${products.length} productos exceden el tope de ${maxProducts}. ` +
        `Se truncó para no pasar las ${MAX_SITEMAP_URLS} URLs del protocolo. ` +
        `Migrar a sitemap index con generateSitemaps().`
    );
  }

  const productEntries: MetadataRoute.Sitemap = products
    .slice(0, maxProducts)
    .flatMap(({ slug, lastModified: productLastMod }) => {
      const path = `/laptop/${slug}`;
      const languages = languageAlternates(path);

      return LOCALES.map((loc) => ({
        url: `${SITE_URL}/${loc}${path}`,
        lastModified: productLastMod,
        // Los precios se revisan a diario (ver el badge del catálogo).
        changeFrequency: "daily" as const,
        priority: loc === DEFAULT_LOCALE ? 0.8 : 0.7,
        alternates: { languages },
      }));
    });

  return [...staticEntries, ...productEntries];
}

/**
 * Resolución del país del visitante — 100% del lado del servidor.
 *
 * Por qué existe
 * --------------
 * `proxy.ts` leía el país de `x-vercel-ip-country` / `cf-ipcountry`, cabeceras
 * que SOLO inyectan Vercel o Cloudflare. El sitio corre en Cloud Run servido
 * directo por Google Frontend (verificado: `server: Google Frontend`, sin
 * balanceador ni CDN delante), así que esas cabeceras nunca llegan y el país
 * caía a "US" para el 100% de los visitantes, en cualquier ubicación.
 *
 * Medido en producción el 2026-08-15: el HTML servido traía 9 menciones de
 * "Lenovo"; forzando el país a AR, 252. El catálogo argentino existía y era
 * inalcanzable.
 *
 * Estrategia por capas, de la señal más confiable a la más barata:
 *
 *   1. Cabecera de plataforma — si algún día se pone Cloudflare o un balanceador
 *      delante, es autoritativa y gratis. Se sigue mirando primero.
 *   2. Cookie ya resuelta — el resultado de una búsqueda anterior. Hace que el
 *      paso 3 ocurra UNA vez por visitante y no una vez por request.
 *   3. Geolocalización por IP — la señal real de DÓNDE ESTÁ el visitante.
 *      Cuesta una llamada externa, así que va cacheada y con timeout corto.
 *   4. "US" — el catálogo más grande, mejor que una página vacía.
 *
 * ⚠️ El IDIOMA NO participa de esta cascada, a propósito.
 *
 * `Accept-Language` describe cómo el visitante configuró su sistema, no dónde
 * está parado. Usarlo como señal de país rompe los dos casos que importan:
 * alguien en Argentina con el navegador en inglés vería el catálogo de EE.UU.,
 * y alguien en EE.UU. con el navegador en español vería el argentino — con
 * precios en pesos y enlaces a una tienda que no le sirve.
 *
 * La relación va en el sentido contrario y la resuelve `proxy.ts`: el país
 * detectado ACÁ determina el idioma inicial (BR→pt, AR/CL/MX/ES→es, IT→it,
 * US→en), y el visitante puede cambiarlo después sin que eso mueva su país.
 *
 * Ninguna capa puede bloquear el renderizado: cualquier fallo cae a la
 * siguiente y, en el peor caso, a "US".
 */

/** Países con catálogo — espejo de `SUPPORTED_COUNTRIES` en `countries.ts`. */
import { SUPPORTED_COUNTRIES, COUNTRY_COOKIE } from "./countries";

const SOPORTADOS: readonly string[] = SUPPORTED_COUNTRIES;

/** Cabeceras de geo que inyectan las distintas plataformas de borde. */
const GEO_HEADERS = [
  "x-vercel-ip-country",   // Vercel
  "cf-ipcountry",          // Cloudflare
  "x-client-geo-location", // Google Cloud LB (formato "US,California")
  "x-appengine-country",   // App Engine
] as const;

/** Timeout de la consulta de geo. Corto a propósito: es mejor caer al
 *  `Accept-Language` que hacer esperar al visitante por una API de terceros. */
const GEO_TIMEOUT_MS = 1500;

/** Caché en memoria de IP → país. Vive lo que viva la instancia de Cloud Run;
 *  no necesita TTL porque la IP de un visitante no cambia de país. El tope
 *  evita que una instancia de larga vida acumule memoria sin límite. */
const CACHE_MAX = 5_000;
const cacheIp = new Map<string, string>();

function recordarIp(ip: string, pais: string): void {
  if (cacheIp.size >= CACHE_MAX) {
    // FIFO simple: borra la entrada más vieja. No hace falta un LRU real para
    // un mapa de este tamaño y este patrón de acceso.
    const primera = cacheIp.keys().next().value;
    if (primera !== undefined) cacheIp.delete(primera);
  }
  cacheIp.set(ip, pais);
}

function normalizar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  // "US,California" (Google LB) → "US"; " ar " → "AR".
  const code = valor.split(",")[0].trim().toUpperCase().slice(0, 2);
  return SOPORTADOS.includes(code) ? code : null;
}

/** Capa 1 — cabecera inyectada por la plataforma de borde, si la hay. */
export function countryFromHeaders(headers: Headers): string | null {
  for (const h of GEO_HEADERS) {
    const pais = normalizar(headers.get(h));
    if (pais) return pais;
  }
  return null;
}

/** IP del cliente según Cloud Run (`x-forwarded-for`: cliente, proxy1, …). */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (!xff) return null;
  const ip = xff.split(",")[0].trim();
  return ip || null;
}

/** Descarta lo que no tiene sentido geolocalizar (local, privada, reservada). */
function esIpPublica(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return false;
  if (/^10\./.test(ip)) return false;
  if (/^192\.168\./.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^169\.254\./.test(ip)) return false;                 // link-local
  if (/^(fc|fd)/i.test(ip)) return false;                    // ULA IPv6
  return true;
}

/**
 * Capa 3 — geolocalización por IP contra un servicio externo.
 *
 * Se usa `ipwho.is`: HTTPS, sin API key y sin cuota diaria dura. La llamada
 * ocurre UNA vez por visitante (después manda la cookie) y una vez por IP por
 * instancia (después manda la caché en memoria).
 *
 * Cualquier fallo devuelve `null` en silencio — es una mejora de precisión,
 * no un requisito: el llamador tiene `Accept-Language` y "US" detrás.
 */
export async function countryFromIp(ip: string): Promise<string | null> {
  if (!esIpPublica(ip)) return null;

  const cacheado = cacheIp.get(ip);
  if (cacheado) return cacheado;

  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`,
      { signal: AbortSignal.timeout(GEO_TIMEOUT_MS), cache: "no-store" },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { success?: boolean; country_code?: string };
    if (!data?.success) return null;

    const pais = normalizar(data.country_code);
    // Solo se cachean los países SOPORTADOS. Un visitante de un país sin
    // catálogo debe seguir cayendo al fallback, no quedar fijado a un valor
    // que después el resto del sistema no sabe interpretar.
    if (pais) recordarIp(ip, pais);
    return pais;
  } catch {
    // Timeout, DNS, servicio caído, JSON roto: todo cae a la capa siguiente.
    return null;
  }
}

export interface CountryResolution {
  readonly country: string;
  /** De dónde salió — se escribe en una cabecera de diagnóstico. Sin esto, un
   *  país equivocado en producción no se puede depurar sin adivinar. */
  readonly source: "header" | "cookie" | "ip" | "default";
  /** true cuando hay que persistirlo en cookie (recién resuelto por IP). */
  readonly shouldPersist: boolean;
}

/**
 * Resuelve el país recorriendo las capas. Nunca lanza.
 *
 * `cookieCountry` se pasa como argumento en vez de leerlo acá para que la
 * función sea pura respecto del transporte y testeable sin un Request.
 */
export async function resolveCountry(
  headers: Headers,
  cookieCountry: string | null,
): Promise<CountryResolution> {
  const porCabecera = countryFromHeaders(headers);
  if (porCabecera) {
    return { country: porCabecera, source: "header", shouldPersist: false };
  }

  const porCookie = normalizar(cookieCountry);
  if (porCookie) {
    return { country: porCookie, source: "cookie", shouldPersist: false };
  }

  const ip = clientIp(headers);
  if (ip) {
    const porIp = await countryFromIp(ip);
    if (porIp) {
      return { country: porIp, source: "ip", shouldPersist: true };
    }
  }

  // Sin señal de ubicación se sirve el catálogo de EE.UU., el más grande. NO
  // se mira `Accept-Language`: un navegador en español no significa que el
  // visitante esté en Argentina, y adivinarlo le mostraría precios en pesos y
  // enlaces a una tienda que no le sirve. Es preferible acertar el default
  // que arriesgar un país equivocado.
  return { country: "US", source: "default", shouldPersist: false };
}

export { COUNTRY_COOKIE };

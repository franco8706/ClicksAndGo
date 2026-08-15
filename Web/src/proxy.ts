import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['es', 'en', 'pt', 'it'];
const defaultLocale = 'es';

// Países que soportamos nativamente con API-First
const SUPPORTED_COUNTRIES = ['AR', 'ES', 'US', 'MX', 'BR', 'CO', 'CL', 'IT'];

const GEO_CURRENCY_MAP: Record<string, string> = {
  AR: 'ARS',
  ES: 'EUR',
  MX: 'MXN',
  US: 'USD',
  BR: 'BRL',
  CO: 'COP',
  CL: 'CLP',
  IT: 'EUR',
};

// Configuración de Tags de Afiliados para conversión optimizada.
// Solo países con afiliación REAL y aprobada. MercadoLibre (AR/MX/BR/CO/CL) se
// sacó de acá: el programa de afiliados de MercadoLibre Argentina exige ser
// monotributista (la cuenta operativa es responsable inscripto) y MX/BR/CO/CL
// nunca se registraron. Los links a MercadoLibre siguen funcionando vía /out
// (están en ALLOWED_OUT_DOMAINS), solo que sin tag hasta tener afiliación real.
const AFFILIATE_TAGS: Record<string, Record<string, string>> = {
  ES: { tag: 'clicksandgo-21', domain: 'amazon.es', network: 'AMAZON' },
  US: { tag: 'clicksandgo-20', domain: 'amazon.com', network: 'AMAZON' },
  IT: { tag: 'clicksandgo08-21', domain: 'amazon.it', network: 'AMAZON' },
};

// 🌍 Idioma sugerido según el país (redirección acorde a la ubicación)
const COUNTRY_LOCALE_MAP: Record<string, string> = {
  BR: 'pt',
  US: 'en',
  IT: 'it',
  ES: 'es', AR: 'es', MX: 'es', CO: 'es', CL: 'es',
};

// =====================================================================
// 🛡️ ALLOWLIST DE DOMINIOS DE SALIDA (/out)
// El gateway de afiliados SOLO redirige a retailers y redes verificadas.
// Cierra el open-redirect (abuso de /out?url=... hacia sitios arbitrarios)
// — motivo de baneo en redes de afiliados y riesgo legal/phishing.
// =====================================================================
const ALLOWED_OUT_DOMAINS = [
  // Marketplaces / redes
  'mercadolibre.com.ar', 'mercadolibre.com.mx', 'mercadolibre.com.br',
  'mercadolibre.com.co', 'mercadolibre.cl', 'mercadolibre.com',
  'mercadolivre.com.br',
  'amazon.com', 'amazon.es', 'amazon.it', 'amazon.com.mx', 'amazon.com.br',
  // Redirectores de redes de afiliados (Awin / CJ)
  'awin1.com', 'anrdoezrs.net', 'jdoqocy.com', 'tkqlhce.com', 'dpbolvw.net',
  // 🔴 Rakuten Advertising (ex LinkShare). `click.linksynergy.com` es el
  // redirector de TODOS sus deeplinks — el `linkurl` que devuelve la Product
  // Search API. Faltaba desde que se integró Rakuten (2026-08-06): las ~880
  // ofertas que trae cada ciclo tenían el botón de compra muerto, devolviendo
  // al visitante al home en vez de a Newegg. Medido el 2026-08-15 con el link
  // real: 307 → clicks-and-go.com/es. Cero comisiones posibles.
  'linksynergy.com',
  // Redirectores de Impact.com (MSI, Lenovo US/ES/IT/BR). Impact genera el
  // link con el ID de tracking YA embebido, así que /out lo deja pasar sin
  // tocarlo (solo Amazon recibe inyección de tag).
  //
  // 🔴 `5nfc.net` es el host que Impact emite para Lenovo Argentina
  // (`lenovo-argentina.5nfc.net`). La nota previa anticipaba el patrón
  // `imp.i{advertiserID}.net`, pero el link REAL del programa usa otro
  // dominio — verificado contra el feed en vivo. Los 264 productos de Lenovo
  // tenían el botón muerto por esto.
  'sjv.io', 'pxf.io', 'ojrq.net', '7eer.net', 'evyy.net', '5nfc.net',
  // Tiendas oficiales de marca (programa retailer directo)
  'lenovo.com', 'hp.com', 'dell.com', 'asus.com', 'acer.com',
  'apple.com', 'msi.com', 'razer.com', 'samsung.com',
];

// Coincidencia exacta o de subdominio (store.lenovo.com ✔, evil-lenovo.com ✘)
// Exportada para poder testear el allowlist sin levantar el proxy entero: es
// la función de la que depende que un clic genere comisión o se pierda.
export function isAllowedOutUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_OUT_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// =====================================================================
// 🛡️ CABECERAS DE SEGURIDAD (aplicadas a toda respuesta HTML)
// =====================================================================
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS: fuerza HTTPS por 2 años (solo aplica bajo https; inofensivo en http local)
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  // CSP base: imágenes de retailers vía https, sin objetos/embeds, sin framing.
  // 'unsafe-inline'/'unsafe-eval' en script por compatibilidad con Next dev/inline;
  // endurecer a nonces cuando se estabilice el runtime de producción.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return response;
}

// Base pública canónica del sitio, inyectada en BUILD: las `NEXT_PUBLIC_*` se
// reemplazan por su valor al compilar, así que lo que llega al contenedor ya
// viene bakeado (ver el ARG del Dockerfile). Detrás de Cloudflare el Host que
// llega al server es `*.run.app` (hay un
// override de Host para que Cloud Run enrute), así que construir el redirect
// desde el Host filtraría esa URL interna al navegador. Con esta base los
// redirects siempre apuntan al dominio real.
const PUBLIC_BASE = process.env.NEXT_PUBLIC_SITE_URL || '';

// Redirect interno SIEMPRE absoluto y válido: base pública si está bakeada, si
// no el origin real de la request (p.ej. el startup probe interno de Cloud Run,
// que pega a `/` sin pasar por Cloudflare — así nunca rompe con Invalid URL).
function publicRedirect(request: NextRequest, path: string, status: 307 | 308 = 307): NextResponse {
  const base = PUBLIC_BASE || request.nextUrl.origin;
  return NextResponse.redirect(new URL(path, base), status);
}

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  try {
    return matchLocale(languages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

/**
 * Punto de entrada del proxy (antes `middleware`).
 *
 * Next 16 deprecó el convenio `middleware.ts`: el archivo pasa a llamarse
 * `proxy.ts` y la función exportada `proxy`. El nombre del export debe
 * coincidir con el del archivo o Next no lo encuentra y **el sitio queda sin
 * ruteo de idioma, sin `/out` y sin cabeceras de seguridad** — falla abierta,
 * no cerrada, así que no es un rename cosmético.
 *
 * Cambio real de fondo: el proxy corre en **runtime Node.js**, no en el edge.
 * `config.matcher` sigue igual, pero la config de segmento de ruta (`runtime`)
 * ya no se admite acá.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Extracción del código de país por IP (Vercel, Cloudflare o Fallback a US)
  const rawCountry = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || 'US';
  let countryCode = rawCountry.toUpperCase().trim().substring(0, 2);

  // =====================================================================
  // ⚡ ANTIGRAVITY UX: Fallback de catálogo vacío
  // Si la IP del usuario pertenece a un país no soportado, lo redirigimos
  // al catálogo con mayor probabilidad de envío internacional (US)
  // =====================================================================
  if (!SUPPORTED_COUNTRIES.includes(countryCode)) {
    countryCode = 'US';
  }

  // =====================================================================
  // 🛒 PASARELA DE AFILIACIÓN INTELIGENTE (/out)
  // Valida, traduce e inyecta el tag correcto según la red y la IP.
  // =====================================================================
  if (pathname === '/out') {
    const targetUrl = searchParams.get('url');

    // Guard 1: URL absoluta y válida. Guard 2: SOLO dominios verificados (anti open-redirect)
    if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http') || !isAllowedOutUrl(targetUrl)) {
      // 🔊 Rechazo RUIDOSO. Devolver al home es correcto ante un intento de
      // open-redirect, pero es indistinguible de un dominio legítimo que
      // nadie agregó al allowlist — y ese caso cuesta plata en silencio:
      // Rakuten y Lenovo estuvieron con el botón de compra muerto sin una
      // sola línea de log que lo dijera. Si aparece en Cloud Run, es una
      // venta que no se pudo concretar, no un ataque.
      console.error(
        `[out] URL rechazada (¿falta el dominio en ALLOWED_OUT_DOMAINS?): ${targetUrl ?? '(vacía)'}`
      );
      return publicRedirect(request, `/${getLocale(request)}`);
    }

    let monetizedUrl = targetUrl;
    const config = AFFILIATE_TAGS[countryCode];

    if (config) {
      // 🛡️ Decisión por HOSTNAME (no substring): un deeplink de Awin/CJ puede
      // contener "amazon" en el query string y NO debe recibir tag de Amazon.
      try {
        const target = new URL(monetizedUrl);
        const host = target.hostname.toLowerCase();
        const isAmazonHost =
          host === 'amazon.com' || host.endsWith('.amazon.com') ||
          host === 'amazon.es'  || host.endsWith('.amazon.es') ||
          host === 'amazon.it'  || host.endsWith('.amazon.it');
        const isMeliHost = host.includes('mercadolibre') || host.includes('mercadolivre');

        if (isAmazonHost && config.network === 'AMAZON') {
          // Traducción de dominio genérica por país (ES→amazon.es, IT→amazon.it, …):
          // SOLO si la URL original es amazon.com genérico. Impulsada por
          // `config.domain` — un país nuevo con programa Amazon propio no
          // requiere tocar esta lógica, solo agregar su entrada en AFFILIATE_TAGS.
          // (El replace por substring anterior convertía amazon.com.mx → amazon.es.mx, inválido.)
          if (
            config.domain.startsWith('amazon.') &&
            host !== config.domain &&
            (host === 'amazon.com' || host.endsWith('.amazon.com'))
          ) {
            target.hostname = config.domain;
          }
          // Inyectar tag de Amazon SOLO para países con programa Amazon Associates propio
          target.searchParams.set('tag', config.tag);
          monetizedUrl = target.toString();
        } else if (isMeliHost && config.network === 'MERCADOLIBRE') {
          // Inyectar tag de MercadoLibre solo para países LATAM con red ML
          target.searchParams.set('affiliate', config.tag);
          monetizedUrl = target.toString();
        }
        // Otros retailers (Lenovo, HP, Dell, etc.): pasar sin modificar.
        // Sus URLs en affiliate_raw ya incluyen los params del programa retailer directo.
      } catch {
        // URL no parseable: se deja intacta y la revalidación de abajo decide.
      }
    }

    // Revalidar tras la traducción de dominio/tags (defensa en profundidad)
    if (!isAllowedOutUrl(monetizedUrl)) {
      // Distinto del rechazo de arriba: acá la URL ENTRÓ válida y la dejó
      // inválida nuestra propia reescritura de dominio/tag. Es un bug
      // nuestro, no un dominio faltante, y conviene poder distinguirlos.
      console.error(
        `[out] La reescritura invalidó una URL que entró permitida: ${targetUrl} → ${monetizedUrl}`
      );
      return publicRedirect(request, `/${getLocale(request)}`);
    }

    try {
      return NextResponse.redirect(new URL(monetizedUrl).toString(), 307);
    } catch {
      return publicRedirect(request, `/${getLocale(request)}`);
    }
  }

  // =====================================================================
  // 🌍 ENRUTAMIENTO GEOGRÁFICO DE IDIOMA Y CABECERAS
  // =====================================================================
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    const currency = GEO_CURRENCY_MAP[countryCode] || 'USD';

    // Inyección de variables limpias al Servidor
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-locale', locale);
    requestHeaders.set('x-country-code', countryCode);
    requestHeaders.set('x-currency', currency);

    const response = NextResponse.next({
      request: { headers: requestHeaders }
    });

    return applySecurityHeaders(response);
  }

  // Si no tiene locale, elegimos idioma acorde a la UBICACIÓN del usuario (geo-first)
  // y caemos al idioma negociado por el navegador para países no mapeados.
  const geoLocale = COUNTRY_LOCALE_MAP[countryCode];
  const detectedLocale = geoLocale && locales.includes(geoLocale) ? geoLocale : getLocale(request);
  // En la raíz, pathname === '/', así que `/${locale}${pathname}` daría `/en/`
  // (barra final) → Next hace 308 a `/en` → doble salto. Lo evitamos: para la
  // raíz redirigimos directo a `/en` (un solo salto, mejor para SEO).
  const suffix = pathname === '/' ? '' : pathname;
  return publicRedirect(request, `/${detectedLocale}${suffix}${request.nextUrl.search}`);
}

export const config = {
  matcher: [
    '/out',
    // robots.txt y sitemap.xml quedan EXCLUIDOS: los sirve Next en la raíz
    // (app/robots.ts, app/sitemap.ts) y NO deben recibir el redirect de idioma
    // — si no, Google los pide en /robots.txt, cae a /es/robots.txt y da 404.
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|robots.txt|sitemap.xml).*)',
  ],
};
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['es', 'en', 'pt'];
const defaultLocale = 'es';

// Países que soportamos nativamente con API-First
const SUPPORTED_COUNTRIES = ['AR', 'ES', 'US', 'MX', 'BR', 'CO', 'CL'];

const GEO_CURRENCY_MAP: Record<string, string> = {
  AR: 'ARS',
  ES: 'EUR',
  MX: 'MXN',
  US: 'USD',
  BR: 'BRL',
  CO: 'COP',
  CL: 'CLP',
};

// Configuración de Tags de Afiliados para conversión optimizada
const AFFILIATE_TAGS: Record<string, Record<string, string>> = {
  ES: { tag: 'clicksandgo-es-21', domain: 'amazon.es', network: 'AWIN' },
  US: { tag: 'clickgo08-20', domain: 'amazon.com', network: 'CJ' },
  AR: { tag: 'clicksandgo-ar-20', domain: 'mercadolibre.com.ar', network: 'MERCADOLIBRE' },
  MX: { tag: 'clicksandgo-mx-20', domain: 'mercadolibre.com.mx', network: 'MERCADOLIBRE' },
  // 🚀 FIX afiliación: países LATAM que antes perdían el tag (comisiones no atribuidas)
  BR: { tag: 'clicksandgo-br-20', domain: 'mercadolibre.com.br', network: 'MERCADOLIBRE' },
  CO: { tag: 'clicksandgo-co-20', domain: 'mercadolibre.com.co', network: 'MERCADOLIBRE' },
  CL: { tag: 'clicksandgo-cl-20', domain: 'mercadolibre.cl', network: 'MERCADOLIBRE' },
};

// 🌍 Idioma sugerido según el país (redirección acorde a la ubicación)
const COUNTRY_LOCALE_MAP: Record<string, string> = {
  BR: 'pt',
  US: 'en',
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
  'amazon.com', 'amazon.es', 'amazon.com.mx', 'amazon.com.br',
  // Redirectores de redes de afiliados (Awin / CJ)
  'awin1.com', 'anrdoezrs.net', 'jdoqocy.com', 'tkqlhce.com', 'dpbolvw.net',
  // Tiendas oficiales de marca (programa retailer directo)
  'lenovo.com', 'hp.com', 'dell.com', 'asus.com', 'acer.com',
  'apple.com', 'msi.com', 'razer.com', 'samsung.com',
];

// Coincidencia exacta o de subdominio (store.lenovo.com ✔, evil-lenovo.com ✘)
function isAllowedOutUrl(raw: string): boolean {
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

export function middleware(request: NextRequest) {
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
  if (pathname.startsWith('/out')) {
    const targetUrl = searchParams.get('url');

    // Guard 1: URL absoluta y válida. Guard 2: SOLO dominios verificados (anti open-redirect)
    if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http') || !isAllowedOutUrl(targetUrl)) {
      return NextResponse.redirect(
        new URL(`/${getLocale(request)}`, request.url), 307
      );
    }

    let monetizedUrl = targetUrl;
    const config = AFFILIATE_TAGS[countryCode];

    if (config) {
      if (monetizedUrl.includes('amazon')) {
        // Traducción de dominio: usuario de ES con URL amazon.com → amazon.es
        if (countryCode === 'ES' && monetizedUrl.includes('amazon.com')) {
          monetizedUrl = monetizedUrl.replace('amazon.com', 'amazon.es');
        }
        // Inyectar tag de Amazon SOLO para países con programa Amazon Associates (ES, US)
        // LATAM usa MercadoLibre — inyectar un tag de Amazon sobre ML sería atribución incorrecta
        if (config.network !== 'MERCADOLIBRE') {
          const sep = monetizedUrl.includes('?') ? '&' : '?';
          monetizedUrl = `${monetizedUrl}${sep}tag=${config.tag}`;
        }
      } else if (monetizedUrl.includes('mercadolibre') && config.network === 'MERCADOLIBRE') {
        // Inyectar tag de MercadoLibre solo para países LATAM con red ML
        const sep = monetizedUrl.includes('?') ? '&' : '?';
        monetizedUrl = `${monetizedUrl}${sep}affiliate=${config.tag}`;
      }
      // Otros retailers (Lenovo, HP, Dell, etc.): pasar sin modificar.
      // Sus URLs en affiliate_raw ya incluyen los params del programa retailer directo.
    }

    // Revalidar tras la traducción de dominio/tags (defensa en profundidad)
    if (!isAllowedOutUrl(monetizedUrl)) {
      return NextResponse.redirect(new URL(`/${getLocale(request)}`, request.url), 307);
    }

    try {
      return NextResponse.redirect(new URL(monetizedUrl).toString(), 307);
    } catch {
      return NextResponse.redirect(
        new URL(`/${getLocale(request)}`, request.url), 307
      );
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
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${detectedLocale}${pathname}`;
  return NextResponse.redirect(redirectUrl, 307);
}

export const config = {
  matcher: [
    '/out',
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js).*)',
  ],
};
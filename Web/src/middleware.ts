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
// Sincronizar con Schema/retailers.json al sumar un retailer nuevo.
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
    return ALLOWED_OUT_DOMAINS.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

const GEO_COOKIE = 'cg_geo';

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

// 🌐 Normaliza a código ISO de 2 letras en mayúsculas
const normCountry = (v: string) => v.toUpperCase().trim().substring(0, 2);

// 🌐 Extrae la IP pública real del visitante (detrás de proxies/CDN/Cloud Run)
function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

// 🌐 Descarta IPs privadas/locales que no sirven para geolocalizar
function isPublicIp(ip: string | null): ip is string {
  if (!ip) return false;
  if (ip === '::1' || ip.startsWith('127.') || ip.startsWith('10.')) return false;
  if (ip.startsWith('192.168.') || ip.startsWith('::ffff:')) return false;
  // 172.16.0.0 – 172.31.255.255
  const m = ip.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return false;
  return true;
}

// 🛰️ Geolocalización por IP (best-effort). Funciona en cualquier host —
// incluido Cloud Run, que NO inyecta cabeceras de país como Vercel/Cloudflare.
// Falla rápido y en silencio si no hay salida a internet (fallback a US).
async function lookupCountryByIp(ip: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.countryCode ? normCountry(data.countryCode) : null;
  } catch {
    return null;
  }
}

// =====================================================================
// 🌍 RESOLUCIÓN DE PAÍS (prioridad, con caché en cookie)
//   1. Override explícito ?geo=XX  (pruebas + preferencia del usuario)
//   2. Cookie cg_geo               (elección previamente resuelta)
//   3. Cabeceras de plataforma     (Vercel / Cloudflare — gratis)
//   4. Geolocalización por IP       (Cloud Run / hosts sin geo-headers)
//   5. Fallback a US
// Devuelve el país y si debe persistirse en cookie.
// =====================================================================
async function resolveCountry(
  request: NextRequest
): Promise<{ country: string; persist: boolean }> {
  const clamp = (c: string) => (SUPPORTED_COUNTRIES.includes(c) ? c : 'US');

  // 1. Override manual
  const override = request.nextUrl.searchParams.get('geo');
  if (override) {
    const c = normCountry(override);
    if (SUPPORTED_COUNTRIES.includes(c)) return { country: c, persist: true };
  }

  // 2. Cookie previa
  const cookie = request.cookies.get(GEO_COOKIE)?.value;
  if (cookie) {
    const c = normCountry(cookie);
    if (SUPPORTED_COUNTRIES.includes(c)) return { country: c, persist: false };
  }

  // 3. Cabeceras de plataforma (Vercel / Cloudflare)
  const header =
    request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');
  if (header) return { country: clamp(normCountry(header)), persist: true };

  // 4. Geolocalización por IP
  const ip = getClientIp(request);
  if (isPublicIp(ip)) {
    const looked = await lookupCountryByIp(ip);
    if (looked) return { country: clamp(looked), persist: true };
  }

  // 5. Fallback
  return { country: 'US', persist: false };
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 🌍 País resuelto por override / cookie / cabeceras / IP
  const { country: countryCode, persist: persistGeo } = await resolveCountry(request);

  // Adjunta la cookie de país a cualquier respuesta (persistencia de la elección)
  const applyGeoCookie = (res: NextResponse) => {
    if (persistGeo) {
      res.cookies.set(GEO_COOKIE, countryCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 días
        sameSite: 'lax',
      });
    }
    return res;
  };

  // =====================================================================
  // 🛒 PASARELA DE AFILIACIÓN INTELIGENTE (/out)
  // Valida, traduce e inyecta el tag correcto según la red y la IP.
  // =====================================================================
  if (pathname.startsWith('/out')) {
    const targetUrl = searchParams.get('url');

    // Guard 1: URL debe ser absoluta y válida para evitar redirects rotos
    // Guard 2: SOLO dominios de retailers/redes verificadas (anti open-redirect)
    if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http') || !isAllowedOutUrl(targetUrl)) {
      return applyGeoCookie(NextResponse.redirect(
        new URL(`/${getLocale(request)}`, request.url), 307
      ));
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

    try {
      return applyGeoCookie(NextResponse.redirect(new URL(monetizedUrl).toString(), 307));
    } catch {
      return applyGeoCookie(NextResponse.redirect(
        new URL(`/${getLocale(request)}`, request.url), 307
      ));
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

    // Cabeceras de Seguridad Zero-Trust
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return applyGeoCookie(response);
  }

  // Si no tiene locale, elegimos idioma acorde a la UBICACIÓN del usuario (geo-first)
  // y caemos al idioma negociado por el navegador para países no mapeados.
  const geoLocale = COUNTRY_LOCALE_MAP[countryCode];
  const detectedLocale = geoLocale && locales.includes(geoLocale) ? geoLocale : getLocale(request);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${detectedLocale}${pathname}`;
  // Conservamos el override ?geo si vino, para que persista tras el redirect de idioma
  return applyGeoCookie(NextResponse.redirect(redirectUrl, 307));
}

export const config = {
  matcher: [
    '/out',
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js).*)',
  ],
};
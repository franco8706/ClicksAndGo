import "server-only";

/**
 * =====================================================================
 * 🔗 Cliente interno Web -> Rails (cuenta de usuario)
 * Server-only: nunca se importa desde un Client Component ni llega al
 * bundle del navegador. Adjunta INTERNAL_API_KEY — la Constitución
 * prohíbe que el frontend hable directo con Postgres; Rails es el único
 * dueño de lectura/escritura, esto es el puente REST hacia esa frontera.
 * =====================================================================
 */

const RAILS_API_URL = process.env.RAILS_API_URL || "http://rails_backend:3000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";

/** ⏱️ Techo de espera a Rails: sin esto, un Rails colgado bloquea el render
 *  (o la Server Action) hasta el límite de request de Cloud Run. */
const RAILS_TIMEOUT_MS = 8_000;

/**
 * 🔁 Reintentos ante fallos TRANSITORIOS.
 *
 * Cloud Run escala desde cero: un cold start o un reemplazo de instancia
 * devuelve 502/503 durante un instante. Sin reintentos, ese instante se
 * traduce en un panel de usuario sin favoritos o una alerta que no se guarda.
 *
 * Qué NO se reintenta y por qué importa:
 *  · 4xx (salvo 429) — un 401/404/422 es determinista: reintentar solo suma
 *    latencia al mismo error.
 *  · Escrituras no idempotentes — ver `railsFetch`: un POST reintentado puede
 *    duplicar el efecto. Solo se reintentan GET y los POST marcados como
 *    seguros de repetir.
 */
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 200;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RailsFetchOptions extends RequestInit {
  /** `true` para métodos no idempotentes que igual son seguros de repetir. */
  readonly retryUnsafe?: boolean;
}

async function railsFetch(path: string, init: RailsFetchOptions = {}): Promise<Response> {
  const { retryUnsafe, ...requestInit } = init;
  const method = (requestInit.method || "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD" || retryUnsafe === true;
  const attempts = idempotent ? RETRY_ATTEMPTS : 1;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(`${RAILS_API_URL}${path}`, {
        ...requestInit,
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": INTERNAL_KEY,
          ...requestInit.headers,
        },
        cache: "no-store",
        // El timeout se re-crea en cada intento: un AbortSignal ya disparado
        // aborta los reintentos al instante y los volvería inútiles.
        signal: requestInit.signal ?? AbortSignal.timeout(RAILS_TIMEOUT_MS),
      });

      if (attempt < attempts && RETRYABLE_STATUS.has(res.status)) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)); // 200ms, 400ms
        continue;
      }
      return res;
    } catch (err) {
      // Red caída o timeout: reintentable mientras queden intentos.
      lastError = err;
      if (attempt < attempts) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`railsFetch agotó ${attempts} intentos en ${path}`);
}

/** IDs de laptops favoritas de un usuario — liviano, para pintar corazones en el catálogo. */
export async function getFavoriteIds(userId: string): Promise<string[]> {
  try {
    const res = await railsFetch(`/api/v1/users/${userId}/favorites?ids_only=true`);
    if (!res.ok) return [];
    return (await res.json()) as string[];
  } catch {
    return [];
  }
}

export interface FavoriteItem {
  laptop_id: string;
  slug: string;
  marca: string;
  modelo: string;
  image_url: string | null;
  country_code: string;
  deal_score: string | null;
  added_at: string;
  precio_actual: string | null;
  moneda: string | null;
}

export async function getFavorites(userId: string): Promise<FavoriteItem[]> {
  try {
    const res = await railsFetch(`/api/v1/users/${userId}/favorites`);
    if (!res.ok) return [];
    return (await res.json()) as FavoriteItem[];
  } catch {
    return [];
  }
}

/** Alterna favorito (guardar/quitar) en un solo round-trip. */
export async function toggleFavorite(userId: string, laptopId: string): Promise<void> {
  await railsFetch(`/api/v1/users/${userId}/favorites/toggle`, {
    method: "POST",
    body: JSON.stringify({ laptop_id: laptopId }),
  }).catch(() => null);
}

export async function removeFavorite(userId: string, laptopId: string): Promise<void> {
  await railsFetch(`/api/v1/users/${userId}/favorites/${laptopId}`, { method: "DELETE" }).catch(() => null);
}

export interface AlertItem {
  id: string;
  target_price: string;
  moneda: string;
  laptop_id: string;
  slug: string;
  marca: string;
  modelo: string;
  precio_actual: string | null;
}

export async function getPriceAlerts(userId: string): Promise<AlertItem[]> {
  try {
    const res = await railsFetch(`/api/v1/users/${userId}/price_alerts`);
    if (!res.ok) return [];
    return (await res.json()) as AlertItem[];
  } catch {
    return [];
  }
}

export async function createPriceAlert(
  userId: string,
  laptopId: string,
  targetPrice: number,
  moneda: string
): Promise<void> {
  await railsFetch(`/api/v1/users/${userId}/price_alerts`, {
    method: "POST",
    body: JSON.stringify({ laptop_id: laptopId, target_price: targetPrice, moneda }),
  }).catch(() => null);
}

export async function deletePriceAlert(userId: string, alertId: string): Promise<void> {
  await railsFetch(`/api/v1/users/${userId}/price_alerts/${alertId}`, { method: "DELETE" }).catch(() => null);
}

export interface UserProfile {
  id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  image: string | null;
  created_at: string | null;
  country_code: string | null;
  detected_country: string | null;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const res = await railsFetch(`/api/v1/users/${userId}/profile`);
    if (!res.ok) return null;
    return (await res.json()) as UserProfile;
  } catch {
    return null;
  }
}

export interface ProfileUpdateInput {
  name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  country_code?: string | null;
}

export async function updateProfile(
  userId: string,
  fields: ProfileUpdateInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await railsFetch(`/api/v1/users/${userId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(fields),
      // PATCH con el mismo payload es idempotente: repetirlo deja el mismo
      // estado. Vale reintentar — perder el guardado del perfil por un 503
      // de cold start le muestra al usuario un error que no es suyo.
      retryUnsafe: true,
    });
    if (!res.ok) return { ok: false, error: "db_error" };
    return { ok: true };
  } catch {
    return { ok: false, error: "db_error" };
  }
}

/** Registra el país detectado por IP + última visita — sin persistir la IP cruda. */
export async function updateGeo(userId: string, detectedCountry: string, locale: string): Promise<void> {
  await railsFetch(`/api/v1/users/${userId}/geo`, {
    method: "PATCH",
    body: JSON.stringify({ detected_country: detectedCountry, preferred_locale: locale }),
    retryUnsafe: true, // idempotente: escribe el mismo país/locale
  }).catch(() => null);
}

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

async function railsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${RAILS_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": INTERNAL_KEY,
      ...init.headers,
    },
    cache: "no-store",
  });
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
  }).catch(() => null);
}

// =====================================================================
// 🌐 CLIENTE API — consume la MISMA API de Rails que la web.
// Zero lógica de negocio acá: la app solo muestra lo que el backend
// ya calculó (precios, deal_score, noticias geolocalizadas).
// =====================================================================
import { API_BASE_URL, WEB_BASE_URL } from "./config";
import type { GeoInfo, HardwareNews, Laptop } from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

// 🌍 País/moneda/idioma resueltos por el backend (un solo lugar de verdad)
export function fetchGeo(override?: string): Promise<GeoInfo> {
  const qs = override ? `?country=${encodeURIComponent(override)}` : "";
  return getJson<GeoInfo>(`/api/v1/geo${qs}`);
}

// 💻 Catálogo geolocalizado
export function fetchLaptops(country: string, limit = 40): Promise<Laptop[]> {
  return getJson<Laptop[]>(`/api/v1/notebooks?country=${country}&limit=${limit}`);
}

// 📰 Noticias geolocalizadas (regionales + globales)
export function fetchNews(country: string): Promise<HardwareNews[]> {
  return getJson<HardwareNews[]>(`/api/v1/notebooks/hardware_news?country=${country}`);
}

// 🛒 URL de compra monetizada — SIEMPRE vía el gateway /out de la web,
// que valida el dominio (allowlist) e inyecta el tag de afiliado correcto
// según el país. Abrir la URL cruda saltearía la monetización.
export function monetizedUrl(laptop: Laptop): string | null {
  const raw = laptop.urls?.affiliate_raw;
  if (!raw || raw === "#" || !raw.startsWith("http")) return null;
  return `${WEB_BASE_URL}/out?url=${encodeURIComponent(raw)}`;
}

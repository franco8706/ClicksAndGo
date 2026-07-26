/**
 * =====================================================================
 * 🧠 Motor de afinidad conductual — 100% client-side
 * Aprende de la actividad del visitante (expandir cards, click de
 * compra, favoritos, filtros de categoría) y rankea el catálogo YA
 * CARGADO según sus intereses.
 *
 * Privacidad / Zero-Trust:
 *  - Vive en localStorage: NADA se envía al servidor (GDPR-friendly,
 *    funciona para visitantes anónimos sin consentimiento adicional).
 *  - No pide datos nuevos: solo re-ordena lo que Rails ya sirvió.
 *  - La matemática de negocio (scores, precios) sigue en Rust/Rails;
 *    esto es selección de presentación, como elegir qué slide mostrar.
 * =====================================================================
 */

import type { Laptop } from "@/types/laptop";

const STORAGE_KEY = "cg_affinity_v1";
const MAX_EVENTS = 120;           // historial acotado (los viejos expiran)
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // media vida: 7 días

/** Peso por tipo de señal: comprar > favorito > expandir > filtrar. */
const SIGNAL_WEIGHT: Record<SignalKind, number> = {
  buy_click: 5,
  favorite: 4,
  expand: 2,
  filter: 1,
};

export type SignalKind = "buy_click" | "favorite" | "expand" | "filter";

interface ActivityEvent {
  readonly kind: SignalKind;
  readonly product_type?: string;
  readonly brand?: string;
  readonly ts: number;
}

function readEvents(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: ActivityEvent[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* almacenamiento lleno o bloqueado: la personalización es opcional */
  }
}

/** Registra una señal de interés del visitante. */
export function recordSignal(
  kind: SignalKind,
  info: { product_type?: string; brand?: string }
) {
  if (typeof window === "undefined") return;
  const events = readEvents();
  events.push({
    kind,
    product_type: info.product_type,
    brand: info.brand?.toUpperCase(),
    ts: Date.now(),
  });
  writeEvents(events);
  // Notifica a los rails montados en la misma página (misma pestaña).
  window.dispatchEvent(new CustomEvent("affinity:updated"));
}

/** ¿Hay suficiente historial como para personalizar? */
export function hasActivity(): boolean {
  return readEvents().length > 0;
}

interface AffinityProfile {
  byType: Map<string, number>;
  byBrand: Map<string, number>;
}

/** Construye el perfil con decaimiento exponencial por antigüedad. */
function buildProfile(): AffinityProfile {
  const now = Date.now();
  const byType = new Map<string, number>();
  const byBrand = new Map<string, number>();
  for (const e of readEvents()) {
    const age = now - e.ts;
    const decay = Math.pow(0.5, age / HALF_LIFE_MS);
    const w = (SIGNAL_WEIGHT[e.kind] || 1) * decay;
    if (e.product_type) byType.set(e.product_type, (byType.get(e.product_type) || 0) + w);
    if (e.brand) byBrand.set(e.brand, (byBrand.get(e.brand) || 0) + w);
  }
  return { byType, byBrand };
}

/**
 * Rankea el catálogo cargado según el perfil del visitante.
 * Devuelve hasta `limit` productos con afinidad > 0, ordenados por
 * afinidad y, a igualdad, por el deal_score que YA calculó el backend.
 */
export function rankByAffinity(laptops: Laptop[], limit = 8): Laptop[] {
  const { byType, byBrand } = buildProfile();
  if (byType.size === 0 && byBrand.size === 0) return [];

  const scored = laptops
    .map((l) => {
      const typeScore = byType.get(l.product_type || "laptop") || 0;
      const brandScore = byBrand.get((l.brand || "").toUpperCase()) || 0;
      return { laptop: l, affinity: typeScore * 2 + brandScore * 3 };
    })
    .filter((s) => s.affinity > 0)
    .sort(
      (a, b) =>
        b.affinity - a.affinity ||
        (b.laptop.intelligence?.deal_score ?? 0) - (a.laptop.intelligence?.deal_score ?? 0)
    );

  return scored.slice(0, limit).map((s) => s.laptop);
}

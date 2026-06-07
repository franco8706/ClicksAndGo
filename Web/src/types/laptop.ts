/**
 * =====================================================================
 * 🛸 CLICKS & GO - Constitución de Datos v4.0 (Frontend DTOs)
 * Sincronización Estricta Completa: Next.js 15+ <-> Rails <-> Python
 * =====================================================================
 */

/** 🏢 Redes de Afiliación y Distribuidores Autorizados (Sincronizado con retailers.json) */
export type RetailerSlug =
  | "mercadolibre"
  | "awin_eu"
  | "cj_us"
  | "amazon"
  | "hp_es"
  | "lenovo_ar"
  | "dell_us"
  | "generic";

/** 🗺️ Divisas Internacionales Soportadas */
export type CurrencyCode = "USD" | "ARS" | "EUR" | "MXN" | "COP" | "CLP" | "BRL";

/** 📍 Códigos de Región ISO Alpha-2 estrictos (CHAR(2)) */
export type CountryCode = "AR" | "ES" | "US" | "MX" | "BR" | "CL" | "CO";

/** 🏷️ Categorías por Propósito (UX) */
export type LaptopCategory = "gaming" | "business" | "ultrabook" | "workstation" | "budget" | "creator" | "student";

/** 📈 Tendencia Estadística de Mercado */
export type PriceTrend = "up" | "down" | "stable";

/** 🛡️ Calificación Semántica Relacional */
export type AIScoreLabel = "ÓPTIMO" | "BUENO" | "REGULAR" | "BAJO";

/** 📦 Condición Física del Hardware */
export type ProductCondition = "new" | "refurbished" | "open_box";

/** 🚨 Niveles de Impacto para Noticias de Hardware */
export type ImpactScore = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// =====================================================================
// 💻 ENTIDAD PRINCIPAL: LAPTOP DTO
// Espejo estricto de lo que devuelve el serializer de Ruby on Rails
// =====================================================================
export interface Laptop {
  readonly id: string;
  readonly slug: string;
  readonly country_code: CountryCode;
  readonly currency: CurrencyCode;
  readonly brand: string;
  readonly name: string;
  readonly condition: ProductCondition;

  readonly hardware: {
    readonly cpu: string;
    readonly ram_gb: number;
    readonly storage_gb: number;
    readonly gpu: string;
    readonly display_inches: number;
    readonly battery_wh?: number;
    readonly weight_kg?: number;
  };

  readonly financials: {
    readonly original_price: number;
    readonly current_price: number;
    readonly discount_pct: number;
    readonly applied_exchange_rate?: number;
    readonly in_stock: boolean;
  };

  readonly intelligence: {
    readonly deal_score: number;
    readonly ai_score_label: AIScoreLabel;
    readonly ai_reasoning?: string;
    readonly price_trend: PriceTrend;
    readonly category: LaptopCategory;
    readonly is_featured_deal: boolean;
    readonly ai_badge?: string;
    readonly ui_accent_color?: string;
  };

  readonly urls: {
    readonly image: string;
    readonly affiliate_raw: string;
  };

  readonly seo?: {
    readonly title?: string;
    readonly description?: string;
  };

  // 🚀 FIX: Contrato estricto para el MarketIntelligenceAgent
  readonly metadata_extra?: {
    readonly retailer?: RetailerSlug;
    readonly is_promo_season?: boolean;
    readonly promo_event?: string;
    readonly market_urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    readonly fomo_message?: string;
    [key: string]: any; // Permite escalabilidad futura
  }
}

// =====================================================================
// 📰 ENTIDAD SECUNDARIA: HARDWARE NEWS DTO
// Contrato de datos para el Radar de Inteligencia Agéntica
// =====================================================================
export interface HardwareNews {
  readonly category: string;
  readonly title: string;
  readonly summary: string;
  readonly impactScore: ImpactScore;
  readonly recordedAt: string;
}

// =====================================================================
// 🔍 ENTIDAD TERCIARIA: SEARCH SUGGESTION
// Utilizado por el buscador predictivo en el HeroSection
// =====================================================================
export interface SearchSuggestion {
  readonly query: string;
  readonly category: LaptopCategory | null;
  readonly result_counts: number;
}
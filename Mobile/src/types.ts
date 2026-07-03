// =====================================================================
// 📐 CONTRATO DE DATOS — espejo del serializer de Rails
// (misma forma que Web/src/types/laptop.ts; mantener sincronizados)
// =====================================================================

export interface LaptopHardware {
  cpu?: string;
  ram_gb?: number;
  storage_gb?: number;
  gpu?: string;
  display_inches?: number;
}

export interface LaptopFinancials {
  original_price: number;
  current_price: number;
  discount_pct: number;
  applied_exchange_rate?: number | null;
  in_stock: boolean;
}

export interface LaptopIntelligence {
  deal_score: number;
  ai_score_label?: string;
  ai_reasoning?: string;
  price_trend?: "up" | "down" | "stable";
  category?: string;
  is_featured_deal?: boolean;
  ai_badge?: string;
  ui_accent_color?: string;
}

export interface Laptop {
  id: string;
  slug: string;
  country_code: string;
  currency: string;
  brand: string;
  name: string;
  condition?: string;
  hardware?: LaptopHardware;
  financials?: LaptopFinancials;
  intelligence?: LaptopIntelligence;
  seo?: { title?: string; description?: string };
  urls?: { image?: string; affiliate_raw?: string };
  metadata_extra?: Record<string, unknown> & { retailer?: string };
}

export interface HardwareNews {
  category: string;
  title: string;
  summary: string;
  impactScore?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recordedAt?: string;
}

export interface GeoInfo {
  country_code: string;
  currency: string;
  locale: "es" | "en" | "pt";
  supported_countries: string[];
}

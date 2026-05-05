// ==========================================
// CLICKS & GO - Domain Types
// Mapeo exacto del modelo Rust & PostgreSQL
// ==========================================

export type Retailer = "Amazon" | "MercadoLibre" | "Dell" | "HP" | "Lenovo" | "Best Buy";

export type LaptopCategory = 
  | "gaming" 
  | "business" 
  | "ultrabook" 
  | "workstation" 
  | "budget" 
  | "creator";

/** Espejo de la tabla 'laptops' en PostgreSQL */
export interface Laptop {
  id: string; // uuid en Rust
  brand: string;
  model: string;
  slug: string;

  // Pricing - f64 en Rust
  price: number;
  original_price: number;
  discount_pct: number; // 0-100

  // AI Scoring - f64 en Rust
  ai_score: number; // 0.0 - 100.0
  ai_score_label: "ÓPTIMO" | "BUENO" | "REGULAR" | "BAJO";
  price_trend: "up" | "down" | "stable"; // Derivado del historial

  // Hardware Specs
  cpu: string;
  ram_gb: number; // Integer
  storage_gb: number; // Integer
  gpu: string;
  display_inches: number; // f64
  battery_wh: number; // f64
  weight_kg: number; // f64

  // Meta
  category: LaptopCategory;
  retailer: Retailer;
  affiliate_url: string;
  image_url: string;
  detected_at: string; // ISO-8601 timestamp
  is_featured_deal: boolean;
  in_stock: boolean;
}

/** Estructura devuelta por el endpoint /api/deals (Escáner en tiempo real) */
export interface AIDeal {
  laptop_id: string;
  headline: string; // ej: "Precio mínimo histórico"
  savings: number;  // Valor absoluto f64
  confidence: number; // 0.0 - 1.0
  expires_at: string | null;
}

/** Envoltura de paginación para listas largas */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

/** Sugerencia del motor de búsqueda IA */
export interface SearchSuggestion {
  query: string;
  category: LaptopCategory | null;
  result_counts: number;
}

/** Estado del agente - Refleja el enum AgentState de Rust */
export type AgentStatus = "idle" | "scanning" | "analyzing" | "complete" | "error";

export interface AgentState {
  status: AgentStatus;
  last_run: string; // ISO-8601
  deals_found: number;
  sources_checked: number;
}

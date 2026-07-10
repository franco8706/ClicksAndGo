/**
 * =====================================================================
 * 📦 CLICKS & GO — Taxonomía de Producto (fuente única, v1)
 * Escalado multi-producto: de "solo notebooks" a todo el catálogo
 * digital de los retailers. Sincronizado con:
 *   - Rails: serializer (`product_type` + `specs`) y migración v3.
 *   - DB:    Infra/db/migration_products_v3.sql (columna product_type).
 * =====================================================================
 */

/** Nivel 2 — el tipo real del producto (discriminador `product_type` en la DB). */
export type ProductType =
  | "laptop"
  | "desktop"
  | "monitor"
  | "keyboard"
  | "mouse"
  | "headphones"
  | "webcam"
  | "printer"
  | "supplies";

/** Nivel 1 — la familia (navegación macro). */
export type ProductFamily = "computing" | "peripherals" | "printing";

/** Orden canónico de tipos para los filtros del catálogo. */
export const PRODUCT_TYPES: readonly ProductType[] = [
  "laptop", "desktop", "monitor",
  "keyboard", "mouse", "headphones", "webcam",
  "printer", "supplies",
] as const;

/** Mapa tipo → familia. */
export const PRODUCT_FAMILY: Record<ProductType, ProductFamily> = {
  laptop: "computing", desktop: "computing", monitor: "computing",
  keyboard: "peripherals", mouse: "peripherals", headphones: "peripherals", webcam: "peripherals",
  printer: "printing", supplies: "printing",
};

/** Ícono (lucide) sugerido por tipo — se resuelve en el cliente. */
export const PRODUCT_ICON: Record<ProductType, string> = {
  laptop: "Laptop", desktop: "Monitor", monitor: "MonitorSmartphone",
  keyboard: "Keyboard", mouse: "Mouse", headphones: "Headphones", webcam: "Webcam",
  printer: "Printer", supplies: "Droplet",
};

/** Un campo de spec a mostrar en la card, con su clave i18n y formato. */
export interface SpecField {
  /** Clave dentro de `product.specs`. */
  readonly key: string;
  /** Clave de traducción en `dict.specs.<labelKey>`. */
  readonly labelKey: string;
  /** Sufijo de unidad (ej. "GB", "Hz", "\""). */
  readonly unit?: string;
  /** bool → se muestra el label si es true (ej. "Inalámbrico", "ANC"). */
  readonly kind?: "value" | "flag";
}

/**
 * Qué specs muestra cada tipo de producto y en qué orden.
 * Las laptops mantienen columnas dedicadas; el serializer de Rails
 * copia esas columnas dentro de `specs` para que el render sea uniforme.
 */
export const SPEC_SCHEMA: Record<ProductType, readonly SpecField[]> = {
  laptop: [
    { key: "cpu", labelKey: "cpu" },
    { key: "ram_gb", labelKey: "ram", unit: "GB" },
    { key: "storage_gb", labelKey: "storage", unit: "GB" },
    { key: "gpu", labelKey: "gpu" },
    { key: "display_inches", labelKey: "screen", unit: "\"" },
  ],
  desktop: [
    { key: "cpu", labelKey: "cpu" },
    { key: "ram_gb", labelKey: "ram", unit: "GB" },
    { key: "storage_gb", labelKey: "storage", unit: "GB" },
    { key: "gpu", labelKey: "gpu" },
  ],
  monitor: [
    { key: "size_inches", labelKey: "size", unit: "\"" },
    { key: "resolution", labelKey: "resolution" },
    { key: "refresh_hz", labelKey: "refresh", unit: "Hz" },
    { key: "panel", labelKey: "panel" },
  ],
  keyboard: [
    { key: "switch", labelKey: "switch" },
    { key: "layout", labelKey: "layout" },
    { key: "wireless", labelKey: "wireless", kind: "flag" },
    { key: "backlit", labelKey: "backlit", kind: "flag" },
  ],
  mouse: [
    { key: "dpi", labelKey: "dpi", unit: "DPI" },
    { key: "sensor", labelKey: "sensor" },
    { key: "buttons", labelKey: "buttons" },
    { key: "wireless", labelKey: "wireless", kind: "flag" },
  ],
  headphones: [
    { key: "form", labelKey: "form" },
    { key: "driver_mm", labelKey: "driver", unit: "mm" },
    { key: "anc", labelKey: "anc", kind: "flag" },
    { key: "wireless", labelKey: "wireless", kind: "flag" },
  ],
  webcam: [
    { key: "resolution", labelKey: "resolution" },
    { key: "fps", labelKey: "fps", unit: "fps" },
    { key: "mic", labelKey: "mic", kind: "flag" },
  ],
  printer: [
    { key: "technology", labelKey: "technology" },
    { key: "ppm", labelKey: "ppm", unit: "ppm" },
    { key: "color", labelKey: "color", kind: "flag" },
    { key: "wifi", labelKey: "wifi", kind: "flag" },
  ],
  supplies: [
    { key: "kind", labelKey: "suppliesKind" },
    { key: "compatibility", labelKey: "compatibility" },
    { key: "yield_pages", labelKey: "yield", unit: "pág." },
  ],
};

/** Formatea un valor de spec para mostrar (respeta unidad y flags). */
export function formatSpec(field: SpecField, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (field.kind === "flag") return value === true || value === "true" ? "✓" : null;
  return field.unit ? `${value} ${field.unit}` : String(value);
}

/**
 * =====================================================================
 * 📦 CLICKS & GO — Taxonomía de Producto (fuente única, v1)
 * Escalado multi-producto: de "solo notebooks" a todo el catálogo
 * digital de los retailers. Sincronizado con:
 *   - Rails: serializer (`product_type` + `specs`) y migración v3.
 *   - DB:    Infra/db/migration_products_v3.sql (columna product_type).
 * =====================================================================
 */

/**
 * Nivel 2 — el tipo real del producto (`product_type` en la DB, `code` en
 * `product_categories`). Espejo de TAXONOMY en Python/src/agents/taxonomy.py.
 *
 * Los 9 primeros son los códigos históricos y conservan su nombre exacto: la
 * FK `fk_laptops_product_type` los referencia y el DTO público los expone, así
 * que renombrarlos habría exigido migrar datos.
 */
export type ProductType =
  // computing
  | "laptop" | "desktop" | "tablets" | "servers" | "workstations"
  // displays
  | "monitor" | "projectors" | "tv"
  // components
  | "cpu" | "gpu" | "ram" | "motherboards" | "power_supplies" | "cooling"
  | "cases" | "sound_cards" | "capture_cards"
  // storage
  | "ssd" | "hdd" | "external_drives" | "usb_flash" | "nas" | "memory_cards"
  | "optical_drives"
  // peripherals
  | "keyboard" | "mouse" | "headphones" | "speakers" | "microphones"
  | "webcam" | "gamepads" | "mousepads"
  // networking
  | "routers" | "switches" | "network_cards" | "range_extenders" | "modems"
  | "cables_network"
  // printing
  | "printer" | "scanners" | "supplies" | "printer_parts" | "paper_media"
  // power
  | "ups" | "surge_protectors" | "batteries" | "chargers" | "cables_power"
  // accessories
  | "docking_stations" | "kvm" | "mounts_stands" | "bags_cases"
  | "laptop_parts" | "adapters" | "cleaning" | "other_accessories";

/** Nivel 1 — la categoría macro (`product_categories.family`). */
export type ProductFamily =
  | "computing" | "displays" | "components" | "storage" | "peripherals"
  | "networking" | "printing" | "power" | "accessories";

/** Mapa tipo → familia. Espejo de TAXONOMY. */
export const PRODUCT_FAMILY: Record<ProductType, ProductFamily> = {
  laptop: "computing", desktop: "computing", tablets: "computing",
  servers: "computing", workstations: "computing",

  monitor: "displays", projectors: "displays", tv: "displays",

  cpu: "components", gpu: "components", ram: "components",
  motherboards: "components", power_supplies: "components",
  cooling: "components", cases: "components", sound_cards: "components",
  capture_cards: "components",

  ssd: "storage", hdd: "storage", external_drives: "storage",
  usb_flash: "storage", nas: "storage", memory_cards: "storage",
  optical_drives: "storage",

  keyboard: "peripherals", mouse: "peripherals", headphones: "peripherals",
  speakers: "peripherals", microphones: "peripherals", webcam: "peripherals",
  gamepads: "peripherals", mousepads: "peripherals",

  routers: "networking", switches: "networking", network_cards: "networking",
  range_extenders: "networking", modems: "networking",
  cables_network: "networking",

  printer: "printing", scanners: "printing", supplies: "printing",
  printer_parts: "printing", paper_media: "printing",

  ups: "power", surge_protectors: "power", batteries: "power",
  chargers: "power", cables_power: "power",

  docking_stations: "accessories", kvm: "accessories",
  mounts_stands: "accessories", bags_cases: "accessories",
  laptop_parts: "accessories", adapters: "accessories",
  cleaning: "accessories", other_accessories: "accessories",
};

/** Orden canónico de tipos, derivado del mapa para que no puedan divergir. */
export const PRODUCT_TYPES: readonly ProductType[] =
  Object.keys(PRODUCT_FAMILY) as ProductType[];

/** Orden canónico de las 9 categorías macro, tal como se navegan. */
export const PRODUCT_FAMILIES: readonly ProductFamily[] = [
  "computing", "displays", "components", "storage",
  "peripherals", "networking", "printing", "power", "accessories",
] as const;

/**
 * Ícono (lucide) por tipo. Es `Partial` a propósito: 56 tipos no necesitan 56
 * íconos distintos, y obligar a declararlos todos garantizaría que el próximo
 * tipo nuevo rompa el build en vez de heredar el de su familia.
 * Resolver siempre con `iconFor`, nunca indexando este mapa directo.
 */
export const PRODUCT_ICON: Partial<Record<ProductType, string>> = {
  laptop: "Laptop", desktop: "Monitor", monitor: "MonitorSmartphone",
  keyboard: "Keyboard", mouse: "Mouse", headphones: "Headphones",
  webcam: "Webcam", printer: "Printer", supplies: "Droplet",
  ssd: "HardDrive", hdd: "HardDrive", nas: "Server", usb_flash: "Usb",
  ram: "MemoryStick", cpu: "Cpu", gpu: "Gpu", motherboards: "CircuitBoard",
  routers: "Router", ups: "BatteryCharging", batteries: "Battery",
  cables_power: "Cable", speakers: "Speaker", microphones: "Mic",
};

/** Ícono por familia — el respaldo cuando el tipo no declara el suyo. */
export const FAMILY_ICON: Record<ProductFamily, string> = {
  computing: "Laptop", displays: "MonitorSmartphone", components: "Cpu",
  storage: "HardDrive", peripherals: "Mouse", networking: "Router",
  printing: "Printer", power: "Zap", accessories: "Package",
};

/** Ícono de un tipo, con respaldo por familia. Nunca devuelve vacío. */
export function iconFor(type: ProductType | string | undefined): string {
  const t = (type || "laptop") as ProductType;
  return PRODUCT_ICON[t] || FAMILY_ICON[PRODUCT_FAMILY[t]] || "Package";
}

/** Familia de un tipo, tolerante a un tipo desconocido (feed nuevo). */
export function familyFor(type: ProductType | string | undefined): ProductFamily | undefined {
  return PRODUCT_FAMILY[(type || "") as ProductType];
}

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
/**
 * `Partial` a propósito, igual que PRODUCT_ICON: los 56 tipos no tienen 56
 * fichas técnicas distintas —un cable no tiene specs— y exigirlas todas haría
 * que agregar un tipo rompa el build. Los dos consumidores ya caen a
 * `SPEC_SCHEMA.laptop` cuando falta, así que el tipo ahora refleja lo que el
 * código ya hacía.
 */
export const SPEC_SCHEMA: Partial<Record<ProductType, readonly SpecField[]>> = {
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

/**
 * Ficha técnica de un tipo, con respaldo garantizado.
 *
 * Devuelve un array SIEMPRE. Indexar `SPEC_SCHEMA` directo da
 * `readonly SpecField[] | undefined` desde que el mapa es `Partial`, y los
 * consumidores terminaban con un `undefined` que TypeScript marcaba en el
 * punto de uso en vez de acá.
 */
export function specSchemaFor(type: ProductType | string | undefined): readonly SpecField[] {
  return SPEC_SCHEMA[(type || "laptop") as ProductType] ?? SPEC_SCHEMA.laptop ?? [];
}

/** Formatea un valor de spec para mostrar (respeta unidad y flags). */
export function formatSpec(field: SpecField, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (field.kind === "flag") return value === true || value === "true" ? "✓" : null;
  return field.unit ? `${value} ${field.unit}` : String(value);
}

/**
 * Título y descripción de producto para SEO y UI.
 *
 * Nace de auditar por qué Search Console reportaba 260 páginas sin indexar
 * contra 37 indexadas (2026-08-10). Lo técnico estaba bien —canonicals,
 * hreflang, robots, JSON-LD, TTFB ~150 ms—; lo que Google rechazaba era el
 * texto. Medido sobre los 2585 productos servidos a US:
 *
 *   · 66% (1718) tenían marca `"Genérica"`, el placeholder del extractor
 *     cuando no reconoce la marca, y salía impreso en el `<title>`:
 *     "Genérica For Satellite C55 S55 C55-C…".
 *   · 13,5% duplicaban la marca porque el título se armaba `${brand} ${name}`
 *     y el nombre del feed ya la traía: "Viewsonic ViewSonic VX1655…".
 *   · La misma marca convivía en varias grafías: `Hp` (188) y `HP` (5),
 *     `Msi` (15) y `MSI` (1), `Lg` (32) y `LG` (1).
 *   · Las 2585 fichas compartían una meta description de plantilla,
 *     `"Análisis experto para {nombre}"`, que además prometía un análisis
 *     inexistente sobre cosas como "POWER SUPPLY 24V".
 *
 * Se corrige en presentación y no en la base a propósito: arregla las 2625
 * fichas al instante, sin migración ni reingesta, y deja intacto el dato
 * crudo del feed (que es el que hay que poder auditar contra el comerciante).
 */

import type { Laptop } from "@/types/laptop";

/** Placeholder del extractor de marca. No es una marca: no se muestra. */
const BRAND_PLACEHOLDERS = new Set(["generica", "genérica", "generic", "unbranded", "oem", ""]);

/**
 * Grafía correcta de las marcas que el catálogo realmente tiene.
 *
 * La clave va en minúsculas; el valor es cómo la escribe el fabricante. Se
 * armó con las 39 marcas presentes en el catálogo, no de memoria: el feed
 * llega en Title Case ("Hp", "Msi") porque el extractor normaliza así.
 */
const BRAND_CASING: Record<string, string> = {
  hp: "HP",
  amd: "AMD",
  lg: "LG",
  msi: "MSI",
  asus: "ASUS",
  benq: "BenQ",
  hyperx: "HyperX",
  steelseries: "SteelSeries",
  viewsonic: "ViewSonic",
  aoc: "AOC",
  apc: "APC",
  ibm: "IBM",
  nvidia: "NVIDIA",
  cyberpower: "CyberPower",
  sandisk: "SanDisk",
  netgear: "NETGEAR",
  startech: "StarTech",
  tplink: "TP-Link",
  "tp-link": "TP-Link",
  emachines: "eMachines",
};

/**
 * Corta un texto en el último límite de palabra antes de `max`.
 *
 * Los nombres del feed llegan topados en 150 caracteres y **cortados a la
 * mitad de una frase**: "…and Built in Stand with...". Cortar de nuevo a lo
 * bruto encadenaría el defecto, así que primero se limpian los puntos
 * suspensivos y las preposiciones colgadas que dejó el truncado del feed.
 */
export function truncateWords(text: string, max: number): string {
  const limpio = quitarConectorFinal(
    text.trim().replace(/[\s.]*\.{2,}$/, ""), // "…Stand with..." → "…Stand with"
  );

  if (limpio.length <= max) return limpio;
  const cortado = limpio.slice(0, max);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  // Si el último espacio cae demasiado atrás, cortar ahí desperdiciaría el
  // ancho disponible: se acepta el corte duro antes que devolver dos palabras.
  const base = ultimoEspacio > max * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado;
  return quitarConectorFinal(base);
}

/**
 * Saca la puntuación y el conector que quedan colgando tras un corte.
 *
 * Cubre los tres idiomas de los feeds —inglés (Newegg/Awin/CJ), español y
 * portugués (MercadoLibre)— porque el truncado no distingue idioma. Solo se
 * aplica al FINAL de un texto ya cortado, así que no puede mutilar un nombre
 * legítimo: ningún producto se llama terminando en "with" o en "de".
 */
function quitarConectorFinal(texto: string): string {
  return texto
    .replace(/[\s,;:–-]+$/, "")
    .replace(
      /\s+\b(with|and|for|or|to|in|of|the|an?|con|para|de|del|y|e|sin|por|com|da|do)\b$/i,
      "",
    )
    .trim();
}

/**
 * `<title>` de la ficha.
 *
 * El nombre del feed mide 126 caracteres de mediana y 150 en el 90% de los
 * casos, así que el título entero se truncaba en el resultado de búsqueda y
 * el sufijo de marca del sitio nunca llegaba a verse. Se acota el nombre para
 * que el título completo entre en lo que Google muestra.
 */
export function seoTitle(brand: string | null | undefined, name: string | null | undefined, suffix = "Clicks & Go"): string {
  const completo = displayTitle(brand, name);
  return `${truncateWords(completo, 62)} - ${suffix}`;
}

/** Marca lista para mostrar, o `""` si el feed no trajo una de verdad. */
export function normalizeBrand(brand?: string | null): string {
  const raw = (brand ?? "").trim();
  const key = raw.toLowerCase();
  if (BRAND_PLACEHOLDERS.has(key)) return "";
  return BRAND_CASING[key] ?? raw;
}

/**
 * Título de producto sin la marca repetida ni el placeholder.
 *
 * `${brand} ${name}` producía "Viewsonic ViewSonic VX1655…" cuando el nombre
 * del feed ya abría con la marca, y "Genérica …" cuando no había marca. Acá
 * la marca se antepone SOLO si aporta información que el nombre no tiene.
 */
export function displayTitle(brand?: string | null, name?: string | null): string {
  const cleanName = (name ?? "").trim();
  const cleanBrand = normalizeBrand(brand);
  if (!cleanBrand) return cleanName;
  if (!cleanName) return cleanBrand;

  // Comparación por palabra: "HP" no debe considerarse repetida en "HPE
  // ProLiant", ni "LG" en "LGA1700". Por eso el límite \b y no un startsWith.
  const yaLaTrae = new RegExp(`^${cleanBrand.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\b`, "i").test(cleanName);
  return yaLaTrae ? cleanName : `${cleanBrand} ${cleanName}`;
}

/**
 * Marcadores donde arranca la ficha técnica dentro del NOMBRE del producto.
 *
 * El feed de Lenovo (Impact) mete la hoja de specs entera en `Name`, topada
 * en 150 caracteres por el normalizador:
 *
 *   "Lenovo ThinkPad X1 2-in-1 Gen 11 Aura Edition (14" Intel) ¡Personalizable!
 *    Procesador Intel® Core™ Ultra 5 325 (núcleos LPE de hasta 3,40 GHz núcleos"
 *
 * En la tarjeta eso ocupa tres líneas y se corta a la mitad de una palabra,
 * cuando lo único que el visitante necesita para decidir es el MODELO. La
 * ficha completa ya está a un clic en "Ver descripción".
 *
 * Se corta por marcador y no solo por longitud porque el corte queda en el
 * lugar semánticamente correcto: justo donde el nombre deja de nombrar y
 * empieza a especificar.
 */
const SPEC_TAIL_MARKERS: readonly RegExp[] = [
  /\s*¡?Personalizable!?.*$/i,        // relleno de marketing de Lenovo
  /\s*\bProcesador\b.*$/i,            // ES — arranque del volcado de specs
  /\s*\bProcessor\b.*$/i,             // EN — mismo patrón en feeds en inglés
];

/**
 * Nombre corto para la tarjeta del catálogo: modelo, sin ficha técnica.
 *
 * `max` por defecto en 70 ≈ dos líneas del `line-clamp-2` de `LaptopCard`
 * al ancho de la grilla. Nunca inventa ni reordena: solo recorta.
 */
export function cardTitle(
  brand?: string | null,
  name?: string | null,
  max = 70,
): string {
  let titulo = displayTitle(brand, name);

  for (const marcador of SPEC_TAIL_MARKERS) {
    titulo = titulo.replace(marcador, "");
  }

  // Separadores que quedan colgando cuando el nombre venía partido: el feed
  // de Lenovo cierra varios títulos con " //" y el corte de specs deja "/".
  titulo = titulo.replace(/[\s/|,;:–-]+$/, "").trim();

  // Si el recorte se comió el nombre entero (un producto que se llamara solo
  // "Procesador…"), es preferible el nombre original truncado que una tarjeta
  // sin título.
  if (!titulo) return truncateWords((name ?? "").trim(), max);

  return truncateWords(titulo, max);
}

/**
 * Parte el título en marca + resto, para el H1 de dos líneas de la ficha.
 *
 * El H1 renderiza la marca arriba y el nombre abajo. Con el nombre del feed —
 * que en el 13,5% de los casos YA abre con la marca— eso imprimía "ViewSonic"
 * sobre "ViewSonic VX1655…". Acá la marca se saca del nombre cuando está, así
 * que aparece exactamente una vez, y `brand` queda vacío cuando el feed no
 * trajo marca real ("Genérica").
 */
export function splitTitle(
  brand?: string | null,
  name?: string | null,
): { readonly brand: string; readonly rest: string } {
  const marca = normalizeBrand(brand);
  const nombre = (name ?? "").trim();
  if (!marca) return { brand: "", rest: nombre };

  const escapada = marca.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  const abreConLaMarca = new RegExp(`^${escapada}\\b[\\s:,-]*`, "i");
  if (abreConLaMarca.test(nombre)) {
    const resto = nombre.replace(abreConLaMarca, "").trim();
    // Si el nombre era SOLO la marca, no dejar la segunda línea vacía.
    return resto ? { brand: marca, rest: resto } : { brand: "", rest: marca };
  }
  return { brand: marca, rest: nombre };
}

/**
 * Patrones de repuesto/parte en el NOMBRE.
 *
 * La categoría sola no alcanza: una pila CMOS de reemplazo queda clasificada
 * en `batteries` (categoría legítima de la taxonomía v8) y una pantalla de
 * reemplazo en `monitor`. Lo que delata al repuesto es cómo se llama —
 * "For <modelo>", "Replacement", "Compatible with".
 */
const PART_NAME_PATTERNS: readonly RegExp[] = [
  /* "For Satellite C55", "for HP Pavilion".
   *
   * `[Ff]or` y no `/for/i`: la mayúscula del MODELO es la señal, y el flag `i`
   * la perdería volviendo `[A-Z0-9]` insensible — con eso "Laptop for everyday
   * work" quedaría descartada como repuesto. Los datos reales traen las dos
   * grafías de la preposición ("For Satellite…", "…Screen for Dell"), así que
   * hay que aceptar ambas sin aflojar lo que viene después. */
  /\b[Ff]or\s+[A-Z0-9]/,
  /\breplacement\b/i,
  /\bcompatible\s+with\b/i,
  /\bspare\s+part/i,
  /\bcmos\s+batter/i,
];

/**
 * Subcategorías que existen en el catálogo pero no merecen una URL indexable.
 *
 * ⚠️ Esto NO las saca del sitio: se siguen navegando, comprando y monetizando.
 * Solo deja de pedirle a Google que gaste rastreo en ellas. La taxonomía v8
 * las declaró a propósito (`power`, `accessories`), así que borrarlas sería
 * revertir una decisión de producto; excluirlas del índice es reversible
 * sacándolas de esta lista.
 *
 * El criterio es competitivo, no de calidad: un cable de corriente genérico no
 * puede posicionar contra Amazon, y 5.600 URLs así diluyen la señal del sitio.
 */
const NON_INDEXABLE_TYPES = new Set([
  "cables_power",
  "cables_network",
  "batteries",
  "chargers",
  "adapters",
  "surge_protectors",
  "laptop_parts",
  "printer_parts",
  "paper_media",
  "cleaning",
  "mousepads",
  "mounts_stands",
  "bags_cases",
  "other_accessories",
]);

/** Datos mínimos para decidir si una ficha merece estar en el índice. */
export interface IndexableInput {
  readonly product_type?: string | null;
  readonly name?: string | null;
}

/**
 * ¿Esta ficha merece entrar al sitemap y ser indexable?
 *
 * Dos señales independientes, porque ninguna alcanza sola: la categoría
 * (commodity que no puede competir) y el nombre (repuesto disfrazado dentro
 * de una categoría legítima).
 */
export function isIndexableProduct({ product_type, name }: IndexableInput): boolean {
  if (product_type && NON_INDEXABLE_TYPES.has(product_type)) return false;
  const n = (name ?? "").trim();
  if (!n) return false;
  return !PART_NAME_PATTERNS.some((re) => re.test(n));
}

/** Textos de la descripción por idioma. Sin librería de i18n: son 4 frases. */
const DESC_STRINGS = {
  es: { desde: "Desde", en: "en", off: "de descuento", sinPrecio: "Precio y disponibilidad actualizados", cierre: "Comparación de precios y ofertas verificadas." },
  en: { desde: "From", en: "at", off: "off", sinPrecio: "Live price and availability", cierre: "Price comparison and verified deals." },
  pt: { desde: "A partir de", en: "em", off: "de desconto", sinPrecio: "Preço e disponibilidade atualizados", cierre: "Comparação de preços e ofertas verificadas." },
  it: { desde: "Da", en: "su", off: "di sconto", sinPrecio: "Prezzo e disponibilità aggiornati", cierre: "Confronto prezzi e offerte verificate." },
} as const;

export type SeoLocale = keyof typeof DESC_STRINGS;

/**
 * Meta description construida con lo que la ficha realmente tiene.
 *
 * Reemplaza la plantilla `"Análisis experto para {nombre}"`, que era idéntica
 * en las 2585 fichas y prometía un análisis que la página no ofrece. Acá solo
 * entran datos verificables —precio, moneda, descuento, specs del backend—
 * y nunca se inventa nada para rellenar: si no hay precio, se dice eso.
 *
 * `formatPrice` se inyecta para no duplicar la lógica de divisas, que vive en
 * `currency.ts` y es la única autorizada a formatear plata.
 */
export function buildMetaDescription(
  product: Laptop,
  locale: string,
  formatPrice: (value: number, currency: string) => string,
): string {
  const t = DESC_STRINGS[(locale as SeoLocale) in DESC_STRINGS ? (locale as SeoLocale) : "es"];
  /* El nombre se acota a 70: entero ocupaba los 160 caracteres disponibles y
   * empujaba el precio —lo único que un comparador tiene para ofrecer en el
   * resultado de búsqueda— fuera del corte. Medido sobre la ficha real: la
   * descripción terminaba en "…Built in Stand with.... Desde $176…". */
  const titulo = truncateWords(displayTitle(product.brand, product.name), 70);
  const precio = product.financials?.current_price ?? 0;
  const descuento = Math.round(product.financials?.discount_pct ?? 0);

  const partes: string[] = [];

  if (precio > 0) {
    const precioStr = formatPrice(precio, product.currency);
    partes.push(
      descuento > 0
        ? `${t.desde} ${precioStr} — ${descuento}% ${t.off}.`
        : `${t.desde} ${precioStr}.`,
    );
  } else {
    partes.push(`${t.sinPrecio}.`);
  }

  // Specs reales del backend, no adjetivos. Se toman como mucho 3: la meta se
  // trunca cerca de los 160 caracteres y de nada sirve escribir para el vacío.
  const specs = (product.specs ?? {}) as Record<string, unknown>;
  const specsUtiles = Object.entries(specs)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false)
    .slice(0, 3)
    .map(([, v]) => String(v));
  if (specsUtiles.length > 0) partes.push(specsUtiles.join(" · ") + ".");

  partes.push(t.cierre);

  const texto = `${titulo}. ${partes.join(" ")}`.replace(/\s+/g, " ").trim();
  return texto.length > 160 ? `${texto.slice(0, 157).trimEnd()}…` : texto;
}

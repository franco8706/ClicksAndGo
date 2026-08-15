import { describe, it, expect } from "vitest";
import {
  normalizeBrand,
  displayTitle,
  splitTitle,
  truncateWords,
  seoTitle,
  isIndexableProduct,
  buildMetaDescription,
  cardTitle,
} from "../productSeo";
import type { Laptop } from "@/types/laptop";

describe("normalizeBrand", () => {
  it('descarta el placeholder "Genérica" — es el 66% del catálogo, no una marca', () => {
    expect(normalizeBrand("Genérica")).toBe("");
    expect(normalizeBrand("generica")).toBe("");
    expect(normalizeBrand("Generic")).toBe("");
    expect(normalizeBrand("OEM")).toBe("");
    expect(normalizeBrand("")).toBe("");
    expect(normalizeBrand(null)).toBe("");
    expect(normalizeBrand(undefined)).toBe("");
  });

  it("corrige la grafía que el feed entrega en Title Case", () => {
    expect(normalizeBrand("Hp")).toBe("HP");
    expect(normalizeBrand("Msi")).toBe("MSI");
    expect(normalizeBrand("Lg")).toBe("LG");
    expect(normalizeBrand("Amd")).toBe("AMD");
    expect(normalizeBrand("Benq")).toBe("BenQ");
    expect(normalizeBrand("Viewsonic")).toBe("ViewSonic");
    expect(normalizeBrand("Steelseries")).toBe("SteelSeries");
  });

  it("unifica las grafías que hoy conviven en el catálogo", () => {
    // `Hp` (188 fichas) y `HP` (5) eran dos marcas distintas para el sitio.
    expect(normalizeBrand("Hp")).toBe(normalizeBrand("HP"));
    expect(normalizeBrand("Msi")).toBe(normalizeBrand("MSI"));
    expect(normalizeBrand("Lg")).toBe(normalizeBrand("LG"));
  });

  it("deja pasar sin tocar una marca que no está en el mapa", () => {
    expect(normalizeBrand("Keychron")).toBe("Keychron");
    expect(normalizeBrand("Bose")).toBe("Bose");
  });
});

describe("displayTitle", () => {
  it("no repite la marca cuando el nombre del feed ya la trae", () => {
    // El caso real: `${brand} ${name}` daba "Viewsonic ViewSonic VX1655…".
    expect(displayTitle("Viewsonic", "ViewSonic VX1655 15.6 Inch Monitor")).toBe(
      "ViewSonic VX1655 15.6 Inch Monitor",
    );
    expect(displayTitle("Hp", "HP Victus 15.6 Gaming Laptop")).toBe("HP Victus 15.6 Gaming Laptop");
    expect(displayTitle("Kingston", "Kingston DataTraveler Micro")).toBe("Kingston DataTraveler Micro");
  });

  it("antepone la marca cuando aporta información que el nombre no tiene", () => {
    expect(displayTitle("Dell", "UD22 Universal Dock 96W")).toBe("Dell UD22 Universal Dock 96W");
  });

  it('nunca imprime "Genérica" como si fuera el fabricante', () => {
    expect(displayTitle("Genérica", "For Satellite C55 S55 Laptop Battery")).toBe(
      "For Satellite C55 S55 Laptop Battery",
    );
  });

  it("compara por palabra: un prefijo que no es la marca no se pierde", () => {
    // "LG" no debe considerarse repetida dentro de "LGA1700", ni "HP" en "HPE".
    expect(displayTitle("LG", "LGA1700 CPU Cooler")).toBe("LG LGA1700 CPU Cooler");
    expect(displayTitle("Hp", "HPE ProLiant MicroServer")).toBe("HP HPE ProLiant MicroServer");
  });

  it("tolera datos ausentes sin devolver espacios sueltos", () => {
    expect(displayTitle(null, "Monitor 24")).toBe("Monitor 24");
    expect(displayTitle("Dell", null)).toBe("Dell");
    expect(displayTitle(null, null)).toBe("");
  });
});

describe("truncateWords", () => {
  it("limpia el truncado a medias que trae el feed", () => {
    // Real: el feed topa los nombres en 150 chars y corta mitad de frase.
    expect(truncateWords("ViewSonic VX1655 and Built in Stand with...", 200)).toBe(
      "ViewSonic VX1655 and Built in Stand",
    );
  });

  it("corta en límite de palabra, no a la mitad", () => {
    const r = truncateWords("Monitor portátil de altísima definición para trabajo", 20);
    expect(r.length).toBeLessThanOrEqual(20);
    expect(r.endsWith(" ")).toBe(false);
    expect(["Monitor portátil de", "Monitor portátil"]).toContain(r);
  });

  it("no toca un texto que ya entra", () => {
    expect(truncateWords("HP Victus 15", 60)).toBe("HP Victus 15");
  });

  it("no deja una preposición colgando al final", () => {
    expect(truncateWords("Teclado mecánico compatible con", 200)).not.toMatch(/\b(con|with|and|for)$/i);
  });
});

describe("seoTitle", () => {
  it("acota el título para que entre en el resultado de búsqueda", () => {
    // Nombre real del catálogo: 150 chars, mediana 126. El sufijo del sitio
    // nunca llegaba a verse.
    const largo =
      "ViewSonic VX1655 15.6 Inch 1080p FHD Portable LED Monitor with 2 Way Powered 60W USB C, Mini HDMI, IPS, Dual Speakers, and Built in Stand with...";
    const t = seoTitle("Viewsonic", largo);
    expect(t.length).toBeLessThanOrEqual(80);
    expect(t).toContain("ViewSonic VX1655");
    expect(t.endsWith("- Clicks & Go")).toBe(true);
    expect(t).not.toContain("Viewsonic ViewSonic");
    expect(t).not.toContain("....");
  });

  it("no recorta un nombre que ya es corto", () => {
    expect(seoTitle("Dell", "UD22 Universal Dock")).toBe("Dell UD22 Universal Dock - Clicks & Go");
  });
});

describe("isIndexableProduct", () => {
  it("excluye las categorías commodity que no pueden posicionar", () => {
    expect(isIndexableProduct({ product_type: "cables_power", name: "Power Cord 6ft" })).toBe(false);
    expect(isIndexableProduct({ product_type: "batteries", name: "Battery Pack" })).toBe(false);
    expect(isIndexableProduct({ product_type: "adapters", name: "USB Adapter" })).toBe(false);
    expect(isIndexableProduct({ product_type: "mousepads", name: "XL Mouse Pad" })).toBe(false);
  });

  it("excluye el repuesto escondido DENTRO de una categoría legítima", () => {
    // Una pila CMOS de reemplazo queda clasificada en `batteries`, pero una
    // pantalla de reemplazo cae en `monitor`: la categoría sola no alcanza.
    expect(isIndexableProduct({ product_type: "monitor", name: "New 15.6 HD LCD Screen For Dell Inspiron" })).toBe(false);
    expect(isIndexableProduct({ product_type: "laptop", name: "Replacement Keyboard for HP Pavilion" })).toBe(false);
    expect(isIndexableProduct({ product_type: "laptop", name: "Compatible with Lenovo ThinkPad T480" })).toBe(false);
  });

  it("deja pasar los productos terminados, que son los que interesan", () => {
    expect(isIndexableProduct({ product_type: "laptop", name: "HP Victus 15.6 Gaming Laptop Ryzen 5" })).toBe(true);
    expect(isIndexableProduct({ product_type: "monitor", name: "ViewSonic VX1655 Portable Monitor" })).toBe(true);
    expect(isIndexableProduct({ product_type: "ups", name: "APC Smart-UPS 2000VA" })).toBe(true);
    expect(isIndexableProduct({ product_type: "gpu", name: "MSI GeForce RTX 4070 Ventus" })).toBe(true);
  });

  it("no confunde 'for' dentro de una palabra ni en minúscula suelta", () => {
    // El patrón exige "for " seguido de un modelo (mayúscula o dígito), así
    // que un título descriptivo normal no se descarta por error.
    expect(isIndexableProduct({ product_type: "laptop", name: "Laptop for everyday work" })).toBe(true);
    expect(isIndexableProduct({ product_type: "monitor", name: "Performance Display 27" })).toBe(true);
  });

  it("descarta una ficha sin nombre", () => {
    expect(isIndexableProduct({ product_type: "laptop", name: "" })).toBe(false);
    expect(isIndexableProduct({ product_type: "laptop", name: null })).toBe(false);
  });

  it("degrada con gracia si falta product_type (payload viejo de Rails)", () => {
    expect(isIndexableProduct({ name: "HP Victus Gaming Laptop" })).toBe(true);
    expect(isIndexableProduct({ name: "Battery For Satellite C55" })).toBe(false);
  });
});

describe("buildMetaDescription", () => {
  const fmt = (v: number, c: string) => `${c} ${v.toFixed(2)}`;

  const base = {
    slug: "x", id: "1", country_code: "US", currency: "USD",
    brand: "Hp", name: "HP Victus 15.6 Gaming Laptop",
    condition: "new", product_type: "laptop",
    specs: { cpu: "Ryzen 5 7535HS", ram_gb: "32GB", storage_gb: "1TB SSD" },
    hardware: {}, urls: { image: null, affiliate_raw: "" },
    financials: { original_price: 1200, current_price: 899, discount_pct: 25, in_stock: true },
    intelligence: { deal_score: 8.7, ai_score_label: "ÓPTIMO", price_trend: "down", category: "gaming", is_featured_deal: true },
  } as unknown as Laptop;

  it("usa datos reales del backend en vez de la plantilla genérica", () => {
    const d = buildMetaDescription(base, "es", fmt);
    expect(d).toContain("HP Victus");
    expect(d).toContain("USD 899.00");
    expect(d).toContain("25%");
    // Lo que reemplaza: la promesa vacía repetida en las 2585 fichas.
    expect(d).not.toContain("Análisis experto");
  });

  it("no repite la marca en la descripción", () => {
    expect(buildMetaDescription(base, "es", fmt)).not.toContain("Hp HP");
  });

  it("respeta el corte de ~160 caracteres que muestra Google", () => {
    const largo = { ...base, name: "HP Victus ".repeat(30) } as unknown as Laptop;
    expect(buildMetaDescription(largo, "es", fmt).length).toBeLessThanOrEqual(160);
  });

  it("dice la verdad cuando no hay precio, en vez de inventarlo", () => {
    const sinPrecio = { ...base, financials: { ...base.financials, current_price: 0, discount_pct: 0 } } as unknown as Laptop;
    const d = buildMetaDescription(sinPrecio, "es", fmt);
    expect(d).toContain("actualizados");
    expect(d).not.toContain("USD 0");
  });

  it("traduce a los 4 idiomas y cae a es ante un locale desconocido", () => {
    expect(buildMetaDescription(base, "en", fmt)).toContain("From");
    expect(buildMetaDescription(base, "pt", fmt)).toContain("A partir de");
    expect(buildMetaDescription(base, "it", fmt)).toContain("Da ");
    expect(buildMetaDescription(base, "xx", fmt)).toContain("Desde");
  });
});

describe("splitTitle", () => {
  it("no repite la marca cuando el nombre ya la trae (H1 de dos líneas)", () => {
    // Real: el H1 imprimía "ViewSonic" sobre "ViewSonic VX1655…".
    expect(splitTitle("Viewsonic", "ViewSonic VX1655 Portable Monitor")).toEqual({
      brand: "ViewSonic",
      rest: "VX1655 Portable Monitor",
    });
    expect(splitTitle("Hp", "HP Victus 15.6 Gaming Laptop")).toEqual({
      brand: "HP",
      rest: "Victus 15.6 Gaming Laptop",
    });
  });

  it("deja la marca aparte cuando el nombre no la incluye", () => {
    expect(splitTitle("Dell", "UD22 Universal Dock")).toEqual({ brand: "Dell", rest: "UD22 Universal Dock" });
  });

  it('no emite marca para el placeholder "Genérica"', () => {
    expect(splitTitle("Genérica", "For Satellite C55 Battery")).toEqual({
      brand: "",
      rest: "For Satellite C55 Battery",
    });
  });

  it("no deja la segunda línea vacía si el nombre era solo la marca", () => {
    expect(splitTitle("Dell", "Dell")).toEqual({ brand: "", rest: "Dell" });
  });

  it("no corta una palabra que solo empieza igual que la marca", () => {
    expect(splitTitle("LG", "LGA1700 Cooler")).toEqual({ brand: "LG", rest: "LGA1700 Cooler" });
  });
});

describe("cardTitle", () => {
  // Nombres REALES del catálogo en producción (2026-08-15).
  it("corta la ficha técnica que Lenovo mete dentro del nombre", () => {
    const real =
      'Lenovo ThinkPad X1 2-in-1 Gen 11 Aura Edition (14" Intel) ¡Personalizable! ' +
      "Procesador Intel® Core™ Ultra 5 325 (núcleos LPE de hasta 3,40 GHz núcleos ";
    expect(cardTitle("Lenovo", real)).toBe(
      'Lenovo ThinkPad X1 2-in-1 Gen 11 Aura Edition (14" Intel)',
    );
  });

  it("corta en 'Procesador' aunque no haya '¡Personalizable!'", () => {
    const real =
      'Lenovo ThinkBook 14 Gen 9 (14" AMD) Procesador AMD Ryzen™ 7 250 ' +
      "(3,30 GHz hasta 5,10 GHz)/Windows 11 Pro 64/512 GB SSD M.2 2242 PCIe Gen4 QLC";
    expect(cardTitle("Lenovo", real)).toBe('Lenovo ThinkBook 14 Gen 9 (14" AMD)');
  });

  it("corta en 'Processor' — los feeds en inglés traen el mismo patrón", () => {
    const real =
      "Dell Pro Micro QCM1250 Desktop -Intel Core Ultra 5 235T Processor " +
      "-32 GB DDR5 RAM,512 GB SSD -Wired Keyboard & Mouse -Win 11 Pro -Black";
    expect(cardTitle("Dell", real)).toBe(
      "Dell Pro Micro QCM1250 Desktop -Intel Core Ultra 5 235T",
    );
  });

  it("limpia el separador colgando que deja el feed de Lenovo", () => {
    expect(cardTitle("Lenovo", "Lenovo Auriculares Wireless VoIP Headset (Teams) //")).toBe(
      "Lenovo Auriculares Wireless VoIP Headset (Teams)",
    );
  });

  it("deja intacto un nombre corto", () => {
    expect(cardTitle("Apple", 'MacBook Pro 14"')).toBe('Apple MacBook Pro 14"');
  });

  it("trunca por palabra cuando no hay marcador de specs (feed de Newegg)", () => {
    const real =
      "ViewSonic VX1655 15.6 Inch 1080p FHD Portable LED Monitor with 2 Way " +
      "Powered 60W USB C, Mini HDMI, IPS, Dual Speakers, and Built in Stand with...";
    const r = cardTitle("ViewSonic", real);
    expect(r.length).toBeLessThanOrEqual(70);
    expect(r.startsWith("ViewSonic VX1655 15.6 Inch")).toBe(true);
    expect(r.endsWith("...")).toBe(false); // no encadena el truncado del feed
  });

  it("nunca deja la tarjeta sin título aunque el nombre sea SOLO ficha técnica", () => {
    // Degradar a un `<h3>` vacío sería peor que mostrar el nombre truncado.
    expect(cardTitle("Lenovo", "Procesador Intel Core i7 de 12va generación")).not.toBe("");
  });

  it("no duplica la marca cuando el nombre ya la trae", () => {
    expect(cardTitle("Lenovo", "Lenovo ThinkPad T14")).toBe("Lenovo ThinkPad T14");
  });
});

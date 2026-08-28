import { describe, it, expect } from "vitest";
import { safeJsonLd } from "../jsonLd";

/**
 * El JSON-LD de la ficha de producto se inyecta con
 * `dangerouslySetInnerHTML`, y su `name`/`brand` vienen del feed de
 * afiliados — es decir, de un vendedor tercero de Newegg. Estos tests fijan
 * la única propiedad que impide que ese título se convierta en XSS
 * almacenado.
 */
describe("safeJsonLd", () => {
  it("neutraliza un cierre de <script> dentro del nombre del producto", () => {
    const payload = {
      "@type": "Product",
      name: 'Mouse </script><img src=x onerror="alert(1)">',
    };
    const salida = safeJsonLd(payload);

    // Lo que importa no es CÓMO se escapa, sino que el navegador no pueda
    // encontrar un cierre de etiqueta ni abrir una nueva.
    expect(salida).not.toContain("</script");
    expect(salida).not.toContain("<img");
    expect(salida).not.toContain("<");
    expect(salida).not.toContain(">");
  });

  it("el resultado SIGUE siendo JSON válido y con el mismo contenido", () => {
    // Si el escape rompiera el parseo, Google descartaría el marcado
    // estructurado entero y perderíamos el rich snippet — el escape no
    // puede costarnos el SEO que justifica esta etiqueta.
    const original = {
      name: 'Laptop <b>Pro</b> & "Max" 16"',
      brand: { "@type": "Brand", name: "Acme & Co" },
      offers: { price: 999.99, priceCurrency: "USD" },
    };
    const parseado = JSON.parse(safeJsonLd(original));
    expect(parseado).toEqual(original);
  });

  it("escapa el ampersand (vector de entidades HTML)", () => {
    // 8 de 100 productos reales de producción traen `&` en el nombre.
    const salida = safeJsonLd({ name: "Bluetooth & 2.4 GHz" });
    expect(salida).not.toContain("&");
    expect(JSON.parse(salida).name).toBe("Bluetooth & 2.4 GHz");
  });

  it("escapa los separadores de línea U+2028 / U+2029", () => {
    // Legales en JSON, ilegales dentro de un literal de JavaScript.
    const salida = safeJsonLd({ name: "a\u2028b\u2029c" });
    expect(salida).not.toContain("\u2028");
    expect(salida).not.toContain("\u2029");
    expect(JSON.parse(salida).name).toBe("a\u2028b\u2029c");
  });

  it("no altera un payload limpio más allá del escape", () => {
    const limpio = { "@context": "https://schema.org", name: "ThinkPad X1" };
    expect(JSON.parse(safeJsonLd(limpio))).toEqual(limpio);
  });
});

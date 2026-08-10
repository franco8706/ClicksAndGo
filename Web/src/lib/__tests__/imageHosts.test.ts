import { describe, it, expect } from "vitest";
import {
  PRODUCT_IMAGE_HOSTS,
  REMOTE_IMAGE_PATTERNS,
  hostMatchesPattern,
  isRenderableImageHost,
} from "../imageHosts";
import { isRealProductImage, STOCK_IMAGE_HOSTS } from "../productImage";

describe("isRenderableImageHost", () => {
  /* 🐛 El caso que rompió el catálogo el 2026-08-10: 2555 de 2557 fotos
   * reales servidas desde el CDN de Newegg, ausente del allowlist, todas
   * rechazadas por next/image con 400. */
  it("acepta el CDN de Newegg, que sirve el 97% del catálogo", () => {
    expect(
      isRenderableImageHost(
        "https://c1.neweggimages.com/ProductImageCompressAll640/AN7GD25112617CLM01E.jpg",
      ),
    ).toBe(true);
    expect(isRenderableImageHost("https://c2.neweggimages.com/foo.jpg")).toBe(true);
  });

  it("acepta los CDNs de comerciante y fabricante ya integrados", () => {
    expect(isRenderableImageHost("https://m.media-amazon.com/images/I/71abc.jpg")).toBe(true);
    expect(isRenderableImageHost("https://http2.mlstatic.com/D_NQ_NP_2X_123-O.webp")).toBe(true);
    expect(
      isRenderableImageHost("https://store.storeimages.cdn-apple.com/1/as-images/mbp.jpg"),
    ).toBe(true);
  });

  it("rechaza un host no declarado — ahí next/image responde 400", () => {
    expect(isRenderableImageHost("https://cdn.comerciante-nuevo.com/foto.jpg")).toBe(false);
  });

  it("rechaza ausencia de URL y URLs inválidas sin lanzar", () => {
    expect(isRenderableImageHost(null)).toBe(false);
    expect(isRenderableImageHost(undefined)).toBe(false);
    expect(isRenderableImageHost("")).toBe(false);
    expect(isRenderableImageHost("no-es-una-url")).toBe(false);
  });
});

describe("hostMatchesPattern", () => {
  it("`**` cubre varios niveles de subdominio", () => {
    expect(hostMatchesPattern("a.b.lenovo.com", "**.lenovo.com")).toBe(true);
    expect(hostMatchesPattern("a.lenovo.com", "**.lenovo.com")).toBe(true);
  });

  it("no deja que un sufijo ajeno se haga pasar por el host", () => {
    // El bug clásico del allowlist: `evil-lenovo.com` NO es `**.lenovo.com`.
    expect(hostMatchesPattern("evil-lenovo.com", "**.lenovo.com")).toBe(false);
    expect(hostMatchesPattern("lenovo.com.attacker.net", "**.lenovo.com")).toBe(false);
  });

  it("el punto es literal, no un comodín del regex", () => {
    expect(hostMatchesPattern("mXmedia-amazon.com", "m.media-amazon.com")).toBe(false);
  });
});

describe("coherencia entre las dos listas", () => {
  /* La denylist legal y la allowlist técnica responden preguntas distintas.
   * Que un host esté en la allowlist no puede volverlo legal: si alguien
   * sumara un banco de stock acá, `isRealProductImage` lo sigue frenando. */
  it("ningún banco de stock entró al allowlist técnico", () => {
    for (const stock of STOCK_IMAGE_HOSTS) {
      expect(isRenderableImageHost(`https://${stock}/photo-123.jpg`)).toBe(false);
      expect(isRealProductImage(`https://${stock}/photo-123.jpg`)).toBe(false);
    }
  });

  it("`remotePatterns` se deriva de la lista, así no pueden divergir", () => {
    expect(REMOTE_IMAGE_PATTERNS).toHaveLength(PRODUCT_IMAGE_HOSTS.length);
    for (const p of REMOTE_IMAGE_PATTERNS) {
      expect(p.protocol).toBe("https");
      expect(PRODUCT_IMAGE_HOSTS).toContain(p.hostname);
    }
  });
});

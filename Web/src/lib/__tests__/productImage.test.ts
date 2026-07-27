import { describe, it, expect } from "vitest";
import { isRealProductImage, STOCK_IMAGE_HOSTS } from "../productImage";

describe("isRealProductImage", () => {
  it("acepta la foto de una CDN de retailer o fabricante", () => {
    expect(isRealProductImage("https://m.media-amazon.com/images/I/71abc.jpg")).toBe(true);
    expect(isRealProductImage("https://asset.msi.com/resize/image/global/product/600.png")).toBe(true);
    expect(isRealProductImage("https://http2.mlstatic.com/D_NQ_NP_2X_123-O.webp")).toBe(true);
  });

  it("rechaza todos los bancos de imágenes de stock", () => {
    for (const host of STOCK_IMAGE_HOSTS) {
      expect(isRealProductImage(`https://${host}/photo-123.jpg`)).toBe(false);
    }
  });

  it("rechaza subdominios de un banco de stock", () => {
    expect(isRealProductImage("https://cdn.unsplash.com/photo-123.jpg")).toBe(false);
  });

  it("rechaza ausencia de imagen: null, undefined y cadena vacía", () => {
    expect(isRealProductImage(null)).toBe(false);
    expect(isRealProductImage(undefined)).toBe(false);
    expect(isRealProductImage("")).toBe(false);
  });

  it("rechaza http:// — el navegador bloquea contenido mixto sobre TLS", () => {
    expect(isRealProductImage("http://m.media-amazon.com/images/I/71abc.jpg")).toBe(false);
  });

  it("rechaza una URL inválida sin lanzar", () => {
    expect(isRealProductImage("https://")).toBe(false);
    expect(isRealProductImage("no-es-una-url")).toBe(false);
  });
});

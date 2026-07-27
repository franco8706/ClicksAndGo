/**
 * Política de imágenes reales — lado cliente.
 *
 * El catálogo solo muestra la foto REAL del producto. Este módulo es la
 * cuarta y última capa de la misma guarda; las otras tres viven donde el
 * dato nace y se guarda:
 *   1. `clean_image_url`            (Python — verifica por HTTP en la ingesta)
 *   2. `chk_laptops_no_stock_image` (Postgres — migration_real_images_v6.sql)
 *   3. `Laptop#real_image_url`      (Rails — el DTO nunca emite un host de stock)
 *
 * La lista de hosts se mantiene idéntica en las cuatro capas.
 */

/** Bancos de imágenes genéricos: una foto de acá nunca es el producto. */
export const STOCK_IMAGE_HOSTS = [
  "images.unsplash.com",
  "unsplash.com",
  "placehold.co",
  "via.placeholder.com",
  "placekitten.com",
  "dummyimage.com",
  "loremflickr.com",
  "picsum.photos",
] as const;

/** ¿Esta URL es la foto real del producto (y por lo tanto se puede mostrar)? */
export function isRealProductImage(url?: string | null): boolean {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host) return false;
    return !STOCK_IMAGE_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

/**
 * Hosts cuyas imágenes el sitio puede RENDERIZAR (allowlist del optimizador).
 *
 * ⚠️ Esta lista es distinta en NATURALEZA a la de `productImage.ts`, y
 * confundirlas costó el catálogo entero:
 *
 *   · `STOCK_IMAGE_HOSTS` (productImage.ts) es una **denylist legal**:
 *     bloquea bancos de stock porque mostrar una foto ajena como si fuera
 *     el producto es una representación engañosa. La comparten las 4 capas
 *     (Python, Postgres, Rails, Web).
 *   · Ésta es una **allowlist técnica**: `next/image` solo optimiza hosts
 *     declarados en `remotePatterns`; ante cualquier otro responde
 *     `400 "url" parameter is not allowed` y la foto NUNCA se ve.
 *
 * La denylist deja pasar todo lo que no sea stock; la allowlist rechaza todo
 * lo que no esté enumerado. Un CDN de comerciante nuevo, entonces, atraviesa
 * limpio las capas 1-3 y muere en la 4 — en silencio, porque `onError` lo
 * degrada al ícono de categoría, que parece intencional.
 *
 * 🐛 Fue exactamente lo que pasó (2026-08-10): Rakuten Advertising se integró
 * *para resolver* la falta de fotos (su feed trae `imageurl` del propio
 * comerciante) y funcionó — 2557 de 2625 productos quedaron con foto real.
 * Pero 2555 venían de `c1.neweggimages.com`, que no estaba acá. El sitio
 * mostraba 2 fotos reales de 2557 disponibles, con 41 errores 400 por carga
 * de página, y el catálogo se veía genérico con los datos correctos en la DB.
 *
 * 📌 Regla operativa: el host de la imagen depende del **comerciante**, no de
 * la red de afiliados. Asociarse a un comerciante nuevo en Rakuten/Awin/CJ
 * puede traer un CDN nuevo, así que sumar un comerciante obliga a revisar
 * esta lista. `npm run check:image-hosts` la contrasta contra el catálogo en
 * vivo y falla si algo quedó afuera.
 */

/** Patrones de host aceptados. `**` = cualquier cantidad de subdominios. */
export const PRODUCT_IMAGE_HOSTS = [
  // 🛒 CDNs de comerciantes que llegan por feed de afiliados
  "**.neweggimages.com", // Newegg vía Rakuten — el 97% del catálogo (2026-08-10)
  "**.newegg.com",
  "**.mlstatic.com", // MercadoLibre
  "m.media-amazon.com", // Amazon PA-API
  "**.awin1.com",

  // 🏭 CDNs de fabricante
  "**.lenovo.com",
  "**.hp.com",
  "**.dell.com",
  "**.static.pub",
  "**.cdn-apple.com",
  "www.apple.com",
  "**.hptstore.com",
  "**.www8-hp.com",
  "**.msi.com",
  "**.asus.com",
  "**.acer.com",
  "**.razer.com",
  "hybrismediaprod.blob.core.windows.net",

  // 👤 Avatares del proveedor OAuth (panel de usuario)
  "lh3.googleusercontent.com",
  "graph.microsoft.com",
  "**.fbcdn.net",
  "platform-lookaside.fbsbx.com",
] as const;

/**
 * ¿El host casa con el patrón, con la semántica de `next/image`?
 *
 * Deliberadamente **no más permisiva** que la del optimizador: `*` cubre un
 * solo segmento y `**` varios. Ése es el invariante que importa — si esta
 * función acepta una URL, el optimizador también la acepta, así que nunca
 * renderizamos un `<img>` condenado a un 400. Si algún día divergen, que sea
 * hacia el lado seguro: un placeholder honesto, jamás una imagen rota.
 */
export function hostMatchesPattern(host: string, pattern: string): boolean {
  const regex = pattern
    .split("**")
    .map((part) =>
      part
        .split("*")
        .map((seg) => seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^.]*"),
    )
    .join(".*");
  return new RegExp(`^${regex}$`).test(host);
}

/** ¿`next/image` va a poder servir esta URL, o responderá 400? */
export function isRenderableImageHost(url?: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PRODUCT_IMAGE_HOSTS.some((p) => hostMatchesPattern(host, p));
  } catch {
    return false;
  }
}

/** `remotePatterns` de `next.config.ts` — derivado, para que no puedan divergir. */
export const REMOTE_IMAGE_PATTERNS = PRODUCT_IMAGE_HOSTS.map((hostname) => ({
  protocol: "https" as const,
  hostname,
}));

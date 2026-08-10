/**
 * Auditoría del allowlist contra el catálogo REAL (no corre en CI por defecto).
 *
 *   npm run check:image-hosts
 *
 * Existe porque el fallo del 2026-08-10 era invisible para todo lo demás: el
 * build pasó, los tests pasaron, el deploy salió verde y el sitio escondía
 * 2555 de 2557 fotos. Ningún test unitario podía atraparlo — la lista estaba
 * bien formada, lo que estaba mal era su contenido frente a los datos.
 *
 * Correr después de asociar un comerciante nuevo en Rakuten/Awin/CJ: el host
 * de la imagen lo pone el comerciante, no la red.
 */
import { describe, it, expect } from "vitest";
import { isRenderableImageHost } from "../imageHosts";

const RAILS_URL =
  process.env.RAILS_PUBLIC_URL ?? "https://clicks-rails-2myrvivvhq-uc.a.run.app";
const COUNTRIES = ["US", "ES", "AR", "MX", "BR", "CO", "CL"];
const PER_PAGE = 100;
const MAX_PAGES = 40;

interface CatalogItem {
  slug?: string;
  urls?: { image?: string | null };
}

async function fetchCatalog(): Promise<CatalogItem[]> {
  const all: CatalogItem[] = [];
  for (const country of COUNTRIES) {
    const seen = new Set<string>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `${RAILS_URL}/api/v1/products?country=${country}&page=${page}&per_page=${PER_PAGE}`,
      );
      if (!res.ok) throw new Error(`Rails ${country} p${page}: HTTP ${res.status}`);
      const body = await res.json();
      const items: CatalogItem[] = Array.isArray(body) ? body : (body.data ?? []);
      const fresh = items.filter((i) => i.slug && !seen.has(i.slug));
      if (fresh.length === 0) break;
      fresh.forEach((i) => seen.add(i.slug!));
      all.push(...fresh);
    }
  }
  return all;
}

describe.skipIf(!process.env.CHECK_LIVE_HOSTS)("allowlist vs catálogo en vivo", () => {
  it(
    "todo host de imagen del catálogo es renderizable por next/image",
    async () => {
      const catalog = await fetchCatalog();
      expect(catalog.length).toBeGreaterThan(0);

      const blocked = new Map<string, number>();
      let withImage = 0;

      for (const item of catalog) {
        const url = item.urls?.image;
        if (!url) continue;
        withImage++;
        if (isRenderableImageHost(url)) continue;
        const host = (() => {
          try {
            return new URL(url).hostname;
          } catch {
            return url;
          }
        })();
        blocked.set(host, (blocked.get(host) ?? 0) + 1);
      }

      const bloqueadas = [...blocked.values()].reduce((a, b) => a + b, 0);
      console.log(
        `Catálogo: ${catalog.length} productos · ${withImage} con foto · ` +
          `${withImage - bloqueadas} renderizables · ${bloqueadas} bloqueadas`,
      );

      const detalle = [...blocked.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([host, n]) => `  ${n} producto(s) → ${host}`)
        .join("\n");

      expect(
        blocked.size,
        `Hay hosts de imagen que next/image rechazará con 400 (las fotos NO se ven).\n` +
          `Agregalos a PRODUCT_IMAGE_HOSTS en src/lib/imageHosts.ts:\n${detalle}`,
      ).toBe(0);
    },
    300_000,
  );
});

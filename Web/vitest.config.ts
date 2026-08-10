import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuración de tests.
 *
 * Existe por una sola razón: vitest corría sin config y por lo tanto **sin el
 * alias `@/`** de `tsconfig.json`. Mientras los módulos bajo test solo usaran
 * imports relativos nadie lo notó, pero en cuanto `app/sitemap.ts` importó
 * `@/lib/productSeo` el test falló con "Failed to load url @/lib/productSeo"
 * — un fallo del runner, no del código, que además apuntaba al archivo
 * equivocado. `tsc` y `next build` resolvían el mismo import sin problema.
 *
 * Se resuelve contra `./src` igual que `tsconfig.json`; si esos dos
 * divergieran, los tests probarían un árbol de módulos distinto al que se
 * despliega.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sitemap from "../sitemap";

/**
 * El sitemap tiene un contrato duro: **nunca puede lanzar**. Un 500 en
 * /sitemap.xml corta el descubrimiento de páginas por parte de Google. Estos
 * tests fijan ese contrato contra cada modo de fallo real de la red/backend.
 */

const STATIC_URLS = 3 * 4; // 3 rutas públicas × 4 idiomas

function mockRails(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    })
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sitemap — contrato de fallo (nunca lanza)", () => {
  it("sirve las rutas estáticas si Rails no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await sitemap();
    expect(result).toHaveLength(STATIC_URLS);
  });

  it("sirve las rutas estáticas si Rails devuelve 500", async () => {
    mockRails(null, false, 500);
    expect(await sitemap()).toHaveLength(STATIC_URLS);
  });

  it("sirve las rutas estáticas si el JSON es inválido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      })
    );
    expect(await sitemap()).toHaveLength(STATIC_URLS);
  });

  it("sirve las rutas estáticas si el payload no es un array", async () => {
    mockRails({ error: "algo salió mal" });
    expect(await sitemap()).toHaveLength(STATIC_URLS);
  });

  it("sirve las rutas estáticas si la petición hace timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "TimeoutError"))
    );
    expect(await sitemap()).toHaveLength(STATIC_URLS);
  });
});

describe("sitemap — saneamiento de datos", () => {
  it("descarta filas corruptas sin perder las válidas", async () => {
    mockRails([
      { slug: "msi-raider-ge78-hx-us", updated_at: "2026-07-20T10:00:00Z" },
      null,
      "no-soy-un-objeto",
      { slug: 123 },
      { slug: "" },
      { slug: "MAYUSCULAS-INVALIDAS" },
      { slug: "espacios prohibidos" },
      { slug: "../../etc/passwd" },
      { slug: "producto-valido-2", updated_at: "2026-07-21T10:00:00Z" },
    ]);

    const result = await sitemap();
    // Solo los 2 slugs válidos sobreviven → 2 productos × 4 idiomas.
    expect(result).toHaveLength(STATIC_URLS + 2 * 4);
    expect(result.every((e) => !e.url.includes(".."))).toBe(true);
    expect(result.every((e) => !/\s/.test(e.url))).toBe(true);
  });

  it("deduplica slugs repetidos", async () => {
    mockRails([
      { slug: "producto-repetido", updated_at: "2026-07-20T10:00:00Z" },
      { slug: "producto-repetido", updated_at: "2026-07-21T10:00:00Z" },
    ]);
    expect(await sitemap()).toHaveLength(STATIC_URLS + 1 * 4);
  });

  it("no produce URLs duplicadas en todo el sitemap", async () => {
    mockRails([
      { slug: "producto-a", updated_at: "2026-07-20T10:00:00Z" },
      { slug: "producto-b", updated_at: "2026-07-20T10:00:00Z" },
    ]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("usa el updated_at real como lastModified", async () => {
    mockRails([{ slug: "producto-a", updated_at: "2026-07-20T10:00:00Z" }]);
    const entry = (await sitemap()).find((e) => e.url.endsWith("/es/laptop/producto-a"));
    expect(entry?.lastModified).toEqual(new Date("2026-07-20T10:00:00Z"));
  });

  it("no explota con un updated_at inválido o ausente", async () => {
    mockRails([
      { slug: "sin-fecha" },
      { slug: "fecha-basura", updated_at: "no-es-una-fecha" },
    ]);
    const result = await sitemap();
    expect(result).toHaveLength(STATIC_URLS + 2 * 4);
    for (const entry of result) {
      expect(Number.isNaN(new Date(entry.lastModified!).getTime())).toBe(false);
    }
  });
});

describe("sitemap — estructura i18n", () => {
  it("emite los 4 idiomas por producto, con hreflang y x-default", async () => {
    mockRails([{ slug: "producto-a", updated_at: "2026-07-20T10:00:00Z" }]);
    const result = await sitemap();

    for (const loc of ["es", "en", "pt", "it"]) {
      const entry = result.find((e) => e.url.endsWith(`/${loc}/laptop/producto-a`));
      expect(entry, `falta la variante ${loc}`).toBeDefined();
      expect(Object.keys(entry!.alternates!.languages!)).toEqual(
        expect.arrayContaining(["es", "en", "pt", "it", "x-default"])
      );
    }
  });

  it("respeta el tope de 50.000 URLs del protocolo", async () => {
    // 13.000 productos × 4 idiomas = 52.000 → hay que truncar.
    const many = Array.from({ length: 13_000 }, (_, i) => ({
      slug: `producto-${i}`,
      updated_at: "2026-07-20T10:00:00Z",
    }));
    mockRails(many);

    const result = await sitemap();
    expect(result.length).toBeLessThanOrEqual(50_000);
  });
});

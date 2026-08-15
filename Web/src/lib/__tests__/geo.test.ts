import { describe, it, expect } from "vitest";
import { countryFromHeaders, clientIp, resolveCountry } from "../geo";

const h = (obj: Record<string, string>) => new Headers(obj);

describe("countryFromHeaders — capa 1 (plataforma de borde)", () => {
  it("lee las cabeceras de Vercel y Cloudflare", () => {
    expect(countryFromHeaders(h({ "x-vercel-ip-country": "AR" }))).toBe("AR");
    expect(countryFromHeaders(h({ "cf-ipcountry": "ES" }))).toBe("ES");
  });

  it('desarma el formato "US,California" del balanceador de Google', () => {
    expect(countryFromHeaders(h({ "x-client-geo-location": "US,California" }))).toBe("US");
  });

  it("normaliza mayúsculas y espacios", () => {
    expect(countryFromHeaders(h({ "cf-ipcountry": " ar " }))).toBe("AR");
  });

  it("ignora países sin catálogo en vez de propagarlos", () => {
    // "XX" es lo que manda Cloudflare para IPs anónimas o de Tor.
    expect(countryFromHeaders(h({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(countryFromHeaders(h({ "cf-ipcountry": "JP" }))).toBeNull();
  });

  it("devuelve null cuando no hay ninguna — el caso real de Cloud Run", () => {
    expect(countryFromHeaders(h({}))).toBeNull();
  });
});

describe("clientIp", () => {
  it("toma la PRIMERA IP de x-forwarded-for (el cliente, no los proxies)", () => {
    expect(clientIp(h({ "x-forwarded-for": "181.45.2.10, 10.0.0.1, 10.0.0.2" }))).toBe("181.45.2.10");
  });

  it("devuelve null sin la cabecera", () => {
    expect(clientIp(h({}))).toBeNull();
  });
});

describe("El IDIOMA no puede mover el país", () => {
  // Los dos casos que Franco pidió explícitamente que funcionaran.

  it("alguien en Argentina con el navegador en inglés ve el catálogo argentino", () => {
    const r = resolveCountry(
      h({ "x-forwarded-for": "181.45.2.10", "accept-language": "en-US,en;q=0.9" }),
      null,
    );
    expect(r.country).toBe("AR");
    expect(r.source).toBe("ip");
  });

  it("alguien en EE.UU. con el navegador en español ve el catálogo de EE.UU.", () => {
    const r = resolveCountry(
      h({ "x-forwarded-for": "72.229.28.185", "accept-language": "es-AR,es;q=0.9" }),
      null,
    );
    expect(r.country).toBe("US");
  });

  it("sin señal de ubicación NO se adivina por el idioma", () => {
    // Adivinar AR por un navegador en español le mostraría a alguien de
    // cualquier parte del mundo precios en pesos y una tienda que no le sirve.
    const r = resolveCountry(h({ "accept-language": "es-AR,es;q=0.9" }), null);
    expect(r).toEqual({ country: "US", source: "default", shouldPersist: false });
  });
});

describe("resolveCountry — la cascada completa", () => {
  it("la cabecera de plataforma gana sobre la cookie y sobre la IP", () => {
    const r = resolveCountry(
      h({ "cf-ipcountry": "ES", "x-forwarded-for": "181.45.2.10" }),
      "MX",
    );
    expect(r).toEqual({ country: "ES", source: "header", shouldPersist: false });
  });

  it("la cookie gana sobre la IP — evita repetir la búsqueda", () => {
    const r = resolveCountry(h({ "x-forwarded-for": "181.45.2.10" }), "CL");
    expect(r).toEqual({ country: "CL", source: "cookie", shouldPersist: false });
  });

  it("geolocaliza por IP y pide persistir el resultado", () => {
    const r = resolveCountry(h({ "x-forwarded-for": "200.75.1.1" }), null);
    expect(r).toEqual({ country: "CL", source: "ip", shouldPersist: true });
  });

  it("no geolocaliza IPs privadas (dev local, health checks internos)", () => {
    expect(resolveCountry(h({ "x-forwarded-for": "10.0.0.5" }), null).source).toBe("default");
    expect(resolveCountry(h({ "x-forwarded-for": "127.0.0.1" }), null).source).toBe("default");
  });

  it("una cookie manipulada a un país sin catálogo no se respeta", () => {
    expect(resolveCountry(h({}), "XX").country).toBe("US");
  });

  it("una IP de un país sin catálogo cae al default", () => {
    // Japón no tiene catálogo: se sirve US, igual que cualquier otro país
    // fuera de los 8 soportados.
    const r = resolveCountry(h({ "x-forwarded-for": "133.11.1.1" }), null);
    expect(r.country).toBe("US");
    expect(r.shouldPersist).toBe(false);
  });

  it("NO sale a la red — la tabla está empotrada en el bundle", () => {
    // La detección decide qué catálogo y qué moneda ve el visitante. Si esto
    // llamara a un tercero, un servicio caído le mostraría el país equivocado.
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("resolveCountry no puede hacer llamadas de red");
    }) as typeof fetch;
    try {
      expect(resolveCountry(h({ "x-forwarded-for": "181.45.2.10" }), null).country).toBe("AR");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("nunca lanza, cualquiera sea la cabecera", () => {
    for (const xff of ["", "basura", "999.999.999.999", "::", ",,,"]) {
      expect(() => resolveCountry(h({ "x-forwarded-for": xff }), null)).not.toThrow();
    }
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { countryFromHeaders, clientIp, resolveCountry } from "../geo";

const h = (obj: Record<string, string>) => new Headers(obj);

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("alguien en Argentina con el navegador en inglés ve el catálogo argentino", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, country_code: "AR" }) }),
    );
    const r = await resolveCountry(
      h({ "x-forwarded-for": "181.45.2.10", "accept-language": "en-US,en;q=0.9" }),
      null,
    );
    expect(r.country).toBe("AR");
  });

  it("alguien en EE.UU. con el navegador en español ve el catálogo de EE.UU.", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, country_code: "US" }) }),
    );
    const r = await resolveCountry(
      h({ "x-forwarded-for": "72.229.28.185", "accept-language": "es-AR,es;q=0.9" }),
      null,
    );
    expect(r.country).toBe("US");
  });

  it('sin señal de ubicación cae a "US" y NO adivina por el idioma', async () => {
    // Adivinar AR por un navegador en español le mostraría a alguien de
    // cualquier parte del mundo precios en pesos y una tienda que no le sirve.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("geo caída")));
    const r = await resolveCountry(h({ "accept-language": "es-AR,es;q=0.9" }), null);
    expect(r).toEqual({ country: "US", source: "default", shouldPersist: false });
  });
});

describe("resolveCountry — la cascada completa", () => {
  it("la cabecera de plataforma gana sobre todo y no consulta la red", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const r = await resolveCountry(
      h({ "cf-ipcountry": "ES", "x-forwarded-for": "181.45.2.10" }),
      "MX",
    );
    expect(r).toEqual({ country: "ES", source: "header", shouldPersist: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("la cookie evita la llamada a la API de geo", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const r = await resolveCountry(h({ "x-forwarded-for": "181.45.2.10" }), "AR");
    expect(r).toEqual({ country: "AR", source: "cookie", shouldPersist: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("geolocaliza por IP y pide persistir el resultado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, country_code: "CL" }) }),
    );
    const r = await resolveCountry(h({ "x-forwarded-for": "190.98.1.5" }), null);
    expect(r).toEqual({ country: "CL", source: "ip", shouldPersist: true });
  });

  it("una API caída no rompe el render", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const r = await resolveCountry(h({ "x-forwarded-for": "200.1.2.3" }), null);
    expect(r.country).toBe("US");
    expect(r.source).toBe("default");
  });

  it("no geolocaliza IPs privadas (dev local, health checks internos)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const r = await resolveCountry(h({ "x-forwarded-for": "10.0.0.5" }), null);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r.source).toBe("default");
  });

  it("una cookie manipulada a un país sin catálogo no se respeta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("nope")));
    expect((await resolveCountry(h({}), "XX")).country).toBe("US");
  });

  it("un país no soportado devuelto por la API no se adopta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, country_code: "JP" }) }),
    );
    const r = await resolveCountry(h({ "x-forwarded-for": "203.0.113.7" }), null);
    expect(r.country).toBe("US");
    expect(r.shouldPersist).toBe(false);
  });

  it("respeta success:false de la API en vez de leer basura", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, message: "reserved range" }) }),
    );
    const r = await resolveCountry(h({ "x-forwarded-for": "203.0.113.9" }), null);
    expect(r.country).toBe("US");
  });
});

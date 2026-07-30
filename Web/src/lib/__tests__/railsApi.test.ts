import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del cliente Web→Rails.
 *
 * Lo crítico acá no es que los reintentos funcionen, sino **qué NO se
 * reintenta**: `toggleFavorite` es un POST no idempotente (repetirlo deshace
 * el efecto), así que un reintento silencioso dejaría al usuario con el
 * corazón en el estado contrario al que pidió. Ese es el test que importa.
 */

const USER = "11111111-2222-3333-4444-555555555555";

// `server-only` lanza si se importa fuera de un entorno de servidor de Next.
vi.mock("server-only", () => ({}));

function mockFetchSequence(...responses: Array<{ ok?: boolean; status: number; body?: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok ?? (r.status >= 200 && r.status < 300),
      status: r.status,
      json: async () => r.body ?? null,
    });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  process.env.RAILS_API_URL = "http://rails-test:3000";
  process.env.INTERNAL_API_KEY = "clave-de-prueba";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

async function load() {
  return await import("../railsApi");
}

describe("railsApi — reintentos en fallos transitorios", () => {
  it.each([502, 503, 504, 429])(
    "reintenta un GET ante %i y devuelve el resultado del reintento",
    async (status) => {
      const fetchMock = mockFetchSequence({ status }, { status: 200, body: ["laptop-1"] });
      const { getFavoriteIds } = await load();

      const ids = await getFavoriteIds(USER);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(ids).toEqual(["laptop-1"]);
    }
  );

  it("reintenta si la red falla y se recupera", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ["l1"] });
    vi.stubGlobal("fetch", fetchMock);

    const { getFavoriteIds } = await load();
    expect(await getFavoriteIds(USER)).toEqual(["l1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("agota como máximo 3 intentos y degrada sin lanzar", async () => {
    const fetchMock = mockFetchSequence({ status: 503 }, { status: 503 }, { status: 503 });
    const { getFavoriteIds } = await load();

    expect(await getFavoriteIds(USER)).toEqual([]); // degradación, no excepción
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404, 422, 500])(
    "NO reintenta ante %i — es determinista, reintentar solo suma latencia",
    async (status) => {
      const fetchMock = mockFetchSequence({ status });
      const { getFavoriteIds } = await load();

      await getFavoriteIds(USER);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it("no reintenta cuando la primera respuesta ya es exitosa", async () => {
    const fetchMock = mockFetchSequence({ status: 200, body: [] });
    const { getFavoriteIds } = await load();

    await getFavoriteIds(USER);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("railsApi — qué NO se puede reintentar", () => {
  it("NUNCA reintenta toggleFavorite: repetirlo deshace el efecto", async () => {
    const fetchMock = mockFetchSequence({ status: 503 }, { status: 200 });
    const { toggleFavorite } = await load();

    await toggleFavorite(USER, "laptop-1");

    // Un reintento dejaría el favorito en el estado CONTRARIO al pedido.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("NUNCA reintenta la creación de una alerta: duplicaría el registro", async () => {
    const fetchMock = mockFetchSequence({ status: 503 }, { status: 201 });
    const { createPriceAlert } = await load();

    await createPriceAlert(USER, "laptop-1", 999, "USD");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("SÍ reintenta updateProfile: un PATCH con el mismo payload es idempotente", async () => {
    const fetchMock = mockFetchSequence({ status: 503 }, { status: 200 });
    const { updateProfile } = await load();

    const res = await updateProfile(USER, { name: "Franco" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
  });
});

describe("railsApi — contrato de cada request", () => {
  it("adjunta la clave interna y el content-type en todos los intentos", async () => {
    const fetchMock = mockFetchSequence({ status: 503 }, { status: 200, body: [] });
    const { getFavoriteIds } = await load();

    await getFavoriteIds(USER);

    for (const call of fetchMock.mock.calls) {
      const headers = call[1].headers as Record<string, string>;
      expect(headers["X-Internal-Key"]).toBe("clave-de-prueba");
      expect(headers["Content-Type"]).toBe("application/json");
    }
  });

  it("cada intento lleva su propio timeout (un signal ya abortado los anularía)", async () => {
    const fetchMock = mockFetchSequence({ status: 503 }, { status: 200, body: [] });
    const { getFavoriteIds } = await load();

    await getFavoriteIds(USER);

    const signals = fetchMock.mock.calls.map((c) => c[1].signal);
    expect(signals.every((s) => s !== undefined)).toBe(true);
    expect(signals[0]).not.toBe(signals[1]); // signal nuevo por intento
  });

  it("nunca cachea: los datos de cuenta son por usuario", async () => {
    const fetchMock = mockFetchSequence({ status: 200, body: [] });
    const { getFavoriteIds } = await load();

    await getFavoriteIds(USER);
    expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
  });

  it("apunta al host de Rails configurado por entorno", async () => {
    const fetchMock = mockFetchSequence({ status: 200, body: [] });
    const { getFavoriteIds } = await load();

    await getFavoriteIds(USER);
    expect(fetchMock.mock.calls[0][0]).toContain("http://rails-test:3000/api/v1/users/");
  });
});

describe("railsApi — degradación segura", () => {
  it("getFavorites devuelve [] si Rails falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const { getFavorites } = await load();
    expect(await getFavorites(USER)).toEqual([]);
  });

  it("getProfile devuelve null si Rails falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const { getProfile } = await load();
    expect(await getProfile(USER)).toBeNull();
  });

  it("toggleFavorite no propaga la excepción (no puede tumbar la Server Action)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const { toggleFavorite } = await load();
    await expect(toggleFavorite(USER, "l1")).resolves.toBeUndefined();
  });
});

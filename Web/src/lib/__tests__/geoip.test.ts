import { describe, it, expect } from "vitest";
import { countryForIp, ipv4ToNumber, ipv6ToHigh64 } from "../geoip";
import { GEO_COUNTRIES, V4_DELTAS, V4_LENS, V4_CC } from "../geoipData";

describe("ipv4ToNumber", () => {
  it("convierte correctamente", () => {
    expect(ipv4ToNumber("0.0.0.0")).toBe(0);
    expect(ipv4ToNumber("1.2.3.4")).toBe(16909060);
    expect(ipv4ToNumber("255.255.255.255")).toBe(4294967295);
  });

  it("rechaza lo malformado en vez de devolver un número cualquiera", () => {
    // Una IP mal parseada no debe geolocalizar a un país al azar.
    expect(ipv4ToNumber("1.2.3")).toBeNull();
    expect(ipv4ToNumber("256.1.1.1")).toBeNull();
    expect(ipv4ToNumber("1.2.3.4.5")).toBeNull();
    expect(ipv4ToNumber("a.b.c.d")).toBeNull();
    expect(ipv4ToNumber("")).toBeNull();
    // Ceros a la izquierda: algunos parsers los leen en octal ("010" = 8).
    expect(ipv4ToNumber("010.1.1.1")).toBeNull();
  });
});

describe("ipv6ToHigh64", () => {
  it("expande la forma comprimida", () => {
    expect(ipv6ToHigh64("2800::")).toBe(ipv6ToHigh64("2800:0:0:0:0:0:0:0"));
    expect(ipv6ToHigh64("::1")).toBe(BigInt(0));
  });

  it("tolera corchetes y zona de scope", () => {
    expect(ipv6ToHigh64("[2800:340::1]")).toBe(ipv6ToHigh64("2800:340::1"));
    expect(ipv6ToHigh64("fe80::1%eth0")).toBe(ipv6ToHigh64("fe80::1"));
  });

  it("rechaza lo inválido", () => {
    expect(ipv6ToHigh64("1.2.3.4")).toBeNull();
    expect(ipv6ToHigh64("2800::1::2")).toBeNull();
    expect(ipv6ToHigh64("zzzz::1")).toBeNull();
  });
});

describe("countryForIp — IPs reales de cada mercado", () => {
  // IPs verificadas contra la tabla generada. Si una regeneración de datos
  // moviera una de estas asignaciones, el test lo dice en vez de que un
  // visitante vea el catálogo equivocado en silencio.
  it.each([
    ["Argentina",  "181.45.2.10",    "AR"],
    ["Argentina",  "190.191.1.1",    "AR"],
    ["Brasil",     "189.6.1.1",      "BR"],
    ["Brasil",     "200.160.2.3",    "BR"],
    ["Chile",      "200.75.1.1",     "CL"],
    ["México",     "187.188.1.1",    "MX"],
    ["España",     "80.58.1.1",      "ES"],
    ["Italia",     "79.10.1.1",      "IT"],
    ["Colombia",   "190.60.1.1",     "CO"],
  ])("%s → %s", (_pais, ip, esperado) => {
    expect(countryForIp(ip)).toBe(esperado);
  });

  it("EE.UU. y otros países sin catálogo propio devuelven null (caen al default)", () => {
    // No están en la tabla a propósito: US es el fallback, así que "sin match"
    // y "US" son el mismo resultado.
    expect(countryForIp("72.229.28.185")).toBeNull();  // US
    expect(countryForIp("8.8.8.8")).toBeNull();        // US
    expect(countryForIp("133.11.1.1")).toBeNull();     // JP
  });

  it("nunca lanza, cualquiera sea la entrada", () => {
    for (const basura of ["", " ", "null", "999.999.999.999", "::", "%%%", "1.2.3.4.5.6"]) {
      expect(() => countryForIp(basura)).not.toThrow();
    }
    expect(countryForIp(null)).toBeNull();
    expect(countryForIp(undefined)).toBeNull();
  });

  it("resuelve una IPv4 mapeada en IPv6 (stack dual)", () => {
    expect(countryForIp("::ffff:181.45.2.10")).toBe("AR");
  });

  it("resuelve IPv6 nativa", () => {
    // Bloque IPv6 de LACNIC asignado a Argentina.
    expect(countryForIp("2800:340::1")).toBe("AR");
  });
});

describe("Integridad de la tabla generada", () => {
  it("los rangos están ordenados y no se solapan", () => {
    const deltas = V4_DELTAS.split(",");
    const lens = V4_LENS.split(",");
    let previo = 0;
    let anteriorFin = -1;
    for (let i = 0; i < deltas.length; i++) {
      const ini = previo + parseInt(deltas[i], 36);
      const fin = ini + parseInt(lens[i], 36);
      expect(ini).toBeGreaterThan(anteriorFin);
      expect(fin).toBeGreaterThanOrEqual(ini);
      anteriorFin = fin;
      previo = fin;
    }
  });

  it("todo índice de país apunta a un país real", () => {
    for (const ch of V4_CC) {
      expect(GEO_COUNTRIES[parseInt(ch, 36)]).toBeTruthy();
    }
  });

  it("los tres arreglos tienen el mismo largo", () => {
    expect(V4_LENS.split(",").length).toBe(V4_DELTAS.split(",").length);
    expect(V4_CC.length).toBe(V4_DELTAS.split(",").length);
  });

  it("ningún valor IPv4 supera el entero seguro de un double", () => {
    // La tabla IPv4 se guarda en Float64Array: por encima de 2^53 se perdería
    // precisión y la búsqueda binaria devolvería el país equivocado.
    // (IPv6 no puede usar Float64Array — llega a 2^64 — y por eso va en BigInt.)
    const deltas = V4_DELTAS.split(",");
    const lens = V4_LENS.split(",");
    let previo = 0;
    for (let i = 0; i < deltas.length; i++) {
      previo = previo + parseInt(deltas[i], 36) + parseInt(lens[i], 36);
    }
    expect(previo).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it("no incluye rangos de EE.UU. — es el fallback y ocuparía de más", () => {
    expect(GEO_COUNTRIES).not.toContain("US");
  });
});

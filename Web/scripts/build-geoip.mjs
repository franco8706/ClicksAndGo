#!/usr/bin/env node
/**
 * Genera `src/lib/geoipData.ts` — la tabla de rangos de IP → país que viaja
 * DENTRO de la imagen.
 *
 * Por qué existe
 * --------------
 * La detección de país no puede depender de un tercero. Una API externa mete
 * en el camino crítico de cada visitante algo que puede estar caído, lento o
 * con cuota agotada, y cuando falla el visitante ve el catálogo equivocado.
 * Acá los datos se compilan al bundle: la búsqueda es una binaria en memoria,
 * sin red, sin timeouts y sin nada que pueda fallar en runtime.
 *
 * Fuente: `@ip-location-db/geo-whois-asn-country`, dominio público (CC0-1.0),
 * derivada de los registros whois de los RIR. No exige atribución ni cuenta.
 *
 * Solo se guardan los 7 países con catálogo DISTINTOS de EE.UU.: como US es
 * el fallback, un rango que no matchea da el mismo resultado que uno marcado
 * "US". Eso baja la tabla de 334.373 rangos a ~31.600.
 *
 * Uso:  node scripts/build-geoip.mjs
 * Correr cuando se agregue un país al catálogo o para refrescar los datos
 * (los RIR reasignan bloques; una vez por trimestre es más que suficiente).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://cdn.jsdelivr.net/npm/@ip-location-db/geo-whois-asn-country";

/** Países con catálogo, SIN "US" — es el fallback y no necesita rangos. */
const PAISES = ["AR", "BR", "CL", "CO", "ES", "IT", "MX"];

const idxPais = new Map(PAISES.map((c, i) => [c, i]));

async function bajarCsv(nombre) {
  const url = `${BASE}/${nombre}`;
  process.stderr.write(`· bajando ${nombre}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${nombre}: HTTP ${res.status}`);
  return res.text();
}

/** Parsea TODAS las filas del CSV, sin filtrar todavía. */
function parsear(csv) {
  const filas = [];
  for (const linea of csv.split("\n")) {
    if (!linea) continue;
    const c1 = linea.indexOf(",");
    const c2 = linea.indexOf(",", c1 + 1);
    if (c1 < 0 || c2 < 0) continue;
    filas.push([
      BigInt(linea.slice(0, c1)),
      BigInt(linea.slice(c1 + 1, c2)),
      linea.slice(c2 + 1).trim(),
    ]);
  }
  return filas;
}

/**
 * Aplana los solapamientos: gana el rango MÁS ESPECÍFICO.
 *
 * El dataset trae 6.825 rangos solapados sobre 334.373 — un bloque chico
 * anidado dentro de uno grande, que es como funcionan las sub-asignaciones de
 * los RIR (un /32 belga dentro de un /23 alemán). La regla correcta es la del
 * enrutamiento: el prefijo más largo manda.
 *
 * ⚠️ Se aplana sobre el dataset COMPLETO y recién después se filtra. Filtrar
 * primero sería un error sutil y caro: un sub-bloque estadounidense anidado
 * dentro de un rango argentino desaparecería del cálculo, y la tabla
 * terminaría marcando como AR una IP que es de EE.UU.
 *
 * Implementación: barrido con PILA. Ordenando por (inicio asc, fin desc), un
 * rango contenido siempre aparece después del que lo contiene, así que la cima
 * de la pila es el más específico vigente en cada punto. Es O(n log n) — cada
 * rango entra y sale una sola vez.
 *
 * (Dos intentos previos no servían: un conjunto de activos recalculado en cada
 * límite era O(n²), y pintar tramos elementales de mayor a menor recorría
 * millones de slots por culpa de los rangos grandes. Sobre 334k rangos ninguno
 * de los dos terminaba.)
 */
function aplanar(filas) {
  const orden = [...filas].sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    return a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0;  // el más grande primero
  });

  const salida = [];
  const pila = [];
  let cursor = null;

  const emitir = (desde, hasta, cc) => {
    if (hasta < desde) return;
    salida.push([desde, hasta, cc]);
  };

  for (const r of orden) {
    // Cierra los rangos que terminan antes de que empiece este.
    while (pila.length && pila[pila.length - 1][1] < r[0]) {
      const top = pila.pop();
      if (cursor !== null && cursor <= top[1]) {
        emitir(cursor, top[1], top[2]);
        cursor = top[1] + 1n;
      }
    }
    // Lo que cubría la cima hasta acá pertenece a la cima.
    if (pila.length && cursor !== null && cursor < r[0]) {
      emitir(cursor, r[0] - 1n, pila[pila.length - 1][2]);
    }
    if (cursor === null || cursor < r[0]) cursor = r[0];
    pila.push(r);
  }

  while (pila.length) {
    const top = pila.pop();
    if (cursor !== null && cursor <= top[1]) {
      emitir(cursor, top[1], top[2]);
      cursor = top[1] + 1n;
    }
  }

  // Fusiona tramos contiguos del mismo país: el aplanado los partió en los
  // límites de otros rangos y sin esto la tabla crecería sin aportar nada.
  const fusionado = [];
  for (const tramo of salida) {
    const ult = fusionado[fusionado.length - 1];
    if (ult && ult[2] === tramo[2] && ult[1] + 1n === tramo[0]) ult[1] = tramo[1];
    else fusionado.push(tramo);
  }
  return fusionado;
}

/** Deja solo los países con catálogo, ya con índice numérico. */
function filtrar(filas) {
  const out = [];
  for (const [ini, fin, cc] of filas) {
    const i = idxPais.get(cc);
    if (i !== undefined) out.push([ini, fin, i]);
  }
  return out;
}

/**
 * IPv4 → tres listas base36 delta-codificadas.
 *
 * El delta se toma contra el FIN del rango anterior, no contra su inicio:
 * los rangos de un mismo país suelen ser contiguos y así el delta queda en 0
 * o cerca, que en base36 es un solo carácter.
 */
function codificarV4(filas) {
  const inicios = [], largos = [], paises = [];
  let previo = 0n;
  for (const [ini, fin, cc] of filas) {
    inicios.push((ini - previo).toString(36));
    largos.push((fin - ini).toString(36));
    paises.push(cc.toString(36));
    previo = fin;
  }
  return { d: inicios.join(","), l: largos.join(","), c: paises.join("") };
}

/**
 * IPv6 → mismo esquema, truncado a /64.
 *
 * Los 64 bits altos alcanzan: ninguna asignación real de país es más fina que
 * un /64.
 *
 * ⚠️ Estos valores llegan hasta 2^64, MUY por encima del entero seguro de un
 * `double` (2^53). Las direcciones IPv6 en uso arrancan en 2000::/3, así que
 * sus 64 bits altos rondan 2,3×10^18 contra el techo de 9×10^15: guardarlos
 * como `number` perdería precisión y la búsqueda binaria devolvería el país
 * equivocado, en silencio. Por eso el lado del runtime los maneja con BigInt
 * y no con `Float64Array` como los de IPv4.
 *
 * El truncado a /64 se hace DESPUÉS de aplanar, y los tramos que colapsan al
 * mismo /64 se fusionan quedándose con el primero.
 */
function codificarV6(filas) {
  const inicios = [], largos = [], paises = [];
  let previo = 0n;
  let ultimoFin = -1n;

  for (const [ini, fin, cc] of filas) {
    const i64 = ini >> 64n;
    const f64 = fin >> 64n;
    if (f64 < i64) continue;
    // Tras truncar, dos tramos vecinos pueden caer en el mismo /64: se
    // conserva el primero en vez de emitir un rango que pisa al anterior y
    // rompe el invariante de orden que asume la búsqueda binaria.
    if (i64 <= ultimoFin) continue;

    inicios.push((i64 - previo).toString(36));
    largos.push((f64 - i64).toString(36));
    paises.push(cc.toString(36));
    previo = f64;
    ultimoFin = f64;
  }
  return { d: inicios.join(","), l: largos.join(","), c: paises.join("") };
}

const [csv4, csv6] = await Promise.all([
  bajarCsv("geo-whois-asn-country-ipv4-num.csv"),
  bajarCsv("geo-whois-asn-country-ipv6-num.csv"),
]);

// Aplanar SOBRE EL DATASET COMPLETO y filtrar después — ver `aplanar()`.
process.stderr.write("· aplanando solapamientos\n");
const filas4 = filtrar(aplanar(parsear(csv4)));
const filas6 = filtrar(aplanar(parsear(csv6)));
const v4 = codificarV4(filas4);
const v6 = codificarV6(filas6);

const salida = `/* eslint-disable */
// ⚠️ ARCHIVO GENERADO — no editar a mano.
// Regenerar con: node scripts/build-geoip.mjs
//
// Tabla de rangos de IP → país, empotrada en el bundle para que la detección
// de ubicación NO dependa de ningún servicio externo. Ver \`lib/geoip.ts\`.
//
// Fuente: @ip-location-db/geo-whois-asn-country (CC0-1.0, dominio público).
// Generado: ${new Date().toISOString().slice(0, 10)}
// Rangos: ${filas4.length} IPv4 · ${filas6.length} IPv6 (/64)
//
// Solo se incluyen los países con catálogo distintos de US: US es el fallback,
// así que un rango sin match da exactamente el mismo resultado.

export const GEO_COUNTRIES = ${JSON.stringify(PAISES)} as const;

/** Deltas de inicio (base36, contra el fin del rango anterior). */
export const V4_DELTAS = "${v4.d}";
/** Largo de cada rango (base36). */
export const V4_LENS = "${v4.l}";
/** Índice de país por rango, un carácter base36 cada uno. */
export const V4_CC = "${v4.c}";

export const V6_DELTAS = "${v6.d}";
export const V6_LENS = "${v6.l}";
export const V6_CC = "${v6.c}";
`;

const aquí = dirname(fileURLToPath(import.meta.url));
const destino = join(aquí, "..", "src", "lib", "geoipData.ts");
writeFileSync(destino, salida, "utf8");

const kb = (Buffer.byteLength(salida) / 1024).toFixed(0);
process.stderr.write(
  `✔ ${destino}\n  ${filas4.length} rangos IPv4 · ${filas6.length} IPv6 · ${kb} KB\n`,
);

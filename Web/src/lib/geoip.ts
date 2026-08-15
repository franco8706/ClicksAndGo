/**
 * Búsqueda IP → país, 100% local y en memoria.
 *
 * Por qué no una API externa
 * --------------------------
 * La detección de ubicación es lo que decide QUÉ CATÁLOGO ve el visitante y en
 * qué moneda. Poner un tercero en ese camino significa que, cuando ese tercero
 * está caído, lento o con la cuota agotada, el visitante ve el catálogo
 * equivocado — y nadie se entera. No hay margen para eso.
 *
 * Los rangos viajan compilados dentro del bundle (`geoipData.ts`, generado por
 * `scripts/build-geoip.mjs` desde datos de dominio público). Acá solo hay
 * aritmética y una búsqueda binaria: sin red, sin timeouts, sin nada que
 * pueda fallar en runtime.
 *
 * Coste: la tabla se descomprime UNA vez por instancia, la primera vez que se
 * consulta (~31.600 rangos IPv4 + ~20.900 IPv6). Después cada lookup son ~15
 * comparaciones sobre un `Float64Array`.
 */
import {
  GEO_COUNTRIES,
  V4_DELTAS, V4_LENS, V4_CC,
  V6_DELTAS, V6_LENS, V6_CC,
} from "./geoipData";

/** Tabla IPv4 — valores hasta 2^32, exactos en un `double`. */
interface TablaV4 {
  readonly inicios: Float64Array;
  readonly fines: Float64Array;
  readonly paises: Uint8Array;
}

/**
 * Tabla IPv6 — valores hasta 2^64, en BigInt.
 *
 * ⚠️ NO se pueden guardar como `number`. Las IPv6 en uso arrancan en 2000::/3,
 * así que sus 64 bits altos rondan 2,3×10^18 contra el entero seguro de un
 * `double`, que es 9×10^15. Almacenarlos como `number` redondearía y la
 * búsqueda binaria devolvería el país equivocado sin ningún síntoma.
 */
interface TablaV6 {
  readonly inicios: bigint[];
  readonly fines: bigint[];
  readonly paises: Uint8Array;
}

function descomprimirV4(deltas: string, largos: string, ccs: string): TablaV4 {
  const dParts = deltas ? deltas.split(",") : [];
  const lParts = largos ? largos.split(",") : [];
  const n = dParts.length;

  const inicios = new Float64Array(n);
  const fines = new Float64Array(n);
  const paises = new Uint8Array(n);

  let previo = 0;
  for (let i = 0; i < n; i++) {
    const ini = previo + parseInt(dParts[i], 36);
    const fin = ini + parseInt(lParts[i], 36);
    inicios[i] = ini;
    fines[i] = fin;
    paises[i] = parseInt(ccs[i], 36);
    previo = fin;
  }
  return { inicios, fines, paises };
}

// Se usa `BigInt(n)` y no literales `0n`/`36n`: el target de TypeScript del
// proyecto es ES2017 y los literales BigInt exigen ES2020. Cambiar el target
// global por este archivo afectaría también al bundle del navegador, y esto
// corre solo en el servidor.
const CERO = BigInt(0);
const B36 = BigInt(36);
const B65536 = BigInt(65536);

/** base36 → BigInt. `parseInt` no sirve acá: pierde precisión por encima de 2^53. */
function base36ToBigInt(s: string): bigint {
  let n = CERO;
  for (let i = 0; i < s.length; i++) {
    n = n * B36 + BigInt(parseInt(s[i], 36));
  }
  return n;
}

function descomprimirV6(deltas: string, largos: string, ccs: string): TablaV6 {
  const dParts = deltas ? deltas.split(",") : [];
  const lParts = largos ? largos.split(",") : [];
  const n = dParts.length;

  const inicios: bigint[] = new Array(n);
  const fines: bigint[] = new Array(n);
  const paises = new Uint8Array(n);

  let previo = CERO;
  for (let i = 0; i < n; i++) {
    const ini = previo + base36ToBigInt(dParts[i]);
    const fin = ini + base36ToBigInt(lParts[i]);
    inicios[i] = ini;
    fines[i] = fin;
    paises[i] = parseInt(ccs[i], 36);
    previo = fin;
  }
  return { inicios, fines, paises };
}

// Descompresión perezosa: una instancia que nunca reciba una request no paga
// el coste, y las que sí lo pagan una sola vez.
let tablaV4: TablaV4 | null = null;
let tablaV6: TablaV6 | null = null;

function v4(): TablaV4 {
  return (tablaV4 ??= descomprimirV4(V4_DELTAS, V4_LENS, V4_CC));
}
function v6(): TablaV6 {
  return (tablaV6 ??= descomprimirV6(V6_DELTAS, V6_LENS, V6_CC));
}

/** Búsqueda binaria en la tabla IPv4. `null` si cae en un hueco. */
function buscarV4(t: TablaV4, valor: number): string | null {
  let lo = 0;
  let hi = t.inicios.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (valor < t.inicios[mid]) hi = mid - 1;
    else if (valor > t.fines[mid]) lo = mid + 1;
    else return GEO_COUNTRIES[t.paises[mid]] ?? null;
  }
  // Hueco: la IP pertenece a un país sin catálogo propio. El llamador cae a US.
  return null;
}

/** Ídem para IPv6, comparando en BigInt. */
function buscarV6(t: TablaV6, valor: bigint): string | null {
  let lo = 0;
  let hi = t.inicios.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (valor < t.inicios[mid]) hi = mid - 1;
    else if (valor > t.fines[mid]) lo = mid + 1;
    else return GEO_COUNTRIES[t.paises[mid]] ?? null;
  }
  return null;
}

/** IPv4 punteada → entero de 32 bits. `null` si no es una IPv4 válida. */
export function ipv4ToNumber(ip: string): number | null {
  const partes = ip.split(".");
  if (partes.length !== 4) return null;
  let n = 0;
  for (const p of partes) {
    // Rechaza vacíos, no-numéricos y ceros a la izquierda ("010" no es una
    // IPv4 válida y algunas librerías lo interpretan en octal, o sea otra IP).
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const b = Number(p);
    if (b > 255) return null;
    n = n * 256 + b;
  }
  return n;
}

/**
 * IPv6 → sus 64 bits altos como número.
 *
 * Se descarta la mitad baja porque la tabla está a granularidad /64: ninguna
 * asignación real de país es más fina que eso.
 */
export function ipv6ToHigh64(ip: string): bigint | null {
  let dir = ip.trim().toLowerCase();
  if (dir.startsWith("[") && dir.endsWith("]")) dir = dir.slice(1, -1);
  // Zona de scope ("fe80::1%eth0") — irrelevante para geolocalizar.
  const pctIdx = dir.indexOf("%");
  if (pctIdx >= 0) dir = dir.slice(0, pctIdx);
  if (!dir.includes(":")) return null;

  // IPv4 embebida ("::ffff:181.45.2.10"): la resuelve el llamador como IPv4.
  const ultimo = dir.slice(dir.lastIndexOf(":") + 1);
  if (ultimo.includes(".")) return null;

  const mitades = dir.split("::");
  if (mitades.length > 2) return null;

  const izq = mitades[0] ? mitades[0].split(":") : [];
  const der = mitades.length === 2 && mitades[1] ? mitades[1].split(":") : [];
  if (izq.length + der.length > 8) return null;

  const grupos: string[] = mitades.length === 2
    ? [...izq, ...Array(8 - izq.length - der.length).fill("0"), ...der]
    : izq;
  if (grupos.length !== 8) return null;

  // Solo hacen falta los primeros 4 grupos (64 bits altos). BigInt y no
  // `number`: 2^64 excede por tres órdenes de magnitud el entero seguro de un
  // double, y redondear acá daría un país equivocado sin ningún síntoma.
  let alto = CERO;
  for (let i = 0; i < 4; i++) {
    const g = grupos[i];
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    alto = alto * B65536 + BigInt(parseInt(g, 16));
  }
  return alto;
}

/**
 * País de una IP, o `null` si no se puede determinar.
 *
 * `null` significa "sin catálogo propio" (incluye a EE.UU., que es el
 * fallback): el llamador decide qué hacer, y siempre es servir US.
 *
 * Nunca lanza. Una IP malformada devuelve `null`, no una excepción: esto corre
 * en el camino de cada request y una entrada rara no puede tumbar el sitio.
 */
export function countryForIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const limpia = ip.trim();
  if (!limpia) return null;

  try {
    // IPv4 mapeada en IPv6 ("::ffff:1.2.3.4") — la manda cualquier stack dual.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(limpia);
    const comoV4 = ipv4ToNumber(mapped ? mapped[1] : limpia);
    if (comoV4 !== null) return buscarV4(v4(), comoV4);

    const alto = ipv6ToHigh64(limpia);
    if (alto !== null) return buscarV6(v6(), alto);
  } catch {
    // Defensa en profundidad: la tabla es generada y validada por test, pero
    // un fallo acá jamás puede propagarse al render.
    return null;
  }
  return null;
}

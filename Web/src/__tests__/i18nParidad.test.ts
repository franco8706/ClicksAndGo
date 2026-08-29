import { describe, it, expect } from "vitest";
import es from "../dictionaries/es.json";
import en from "../dictionaries/en.json";
import pt from "../dictionaries/pt.json";
// ⚠️ `itDict`, NO `it`: importarlo como `it` pisa la función de vitest
// y `it.each` deja de existir (fallo real que costó una corrida).
import itDict from "../dictionaries/it.json";

/**
 * 🌍 Paridad de claves entre los 4 idiomas.
 *
 * El sitio detecta el país por IP y carga el idioma correspondiente (BR→pt,
 * AR/CL/MX/ES→es, IT→it, US→en). Cuando falta una clave, el componente cae al
 * literal en español que lleva hardcodeado como respaldo — así que un
 * brasileño ve una frase suelta en español y NADA falla de forma visible.
 *
 * La paridad se verificó a mano el 2026-07-26 (264 claves × 4). Se rompe sola
 * en cuanto alguien agrega un texto y se olvida de un idioma, y por eso hace
 * falta un test y no una revisión manual.
 */
type Json = Record<string, unknown>;

function rutas(obj: Json, prefijo = ""): string[] {
  return Object.entries(obj).flatMap(([clave, valor]) => {
    const ruta = `${prefijo}${clave}`;
    return valor !== null && typeof valor === "object" && !Array.isArray(valor)
      ? rutas(valor as Json, `${ruta}.`)
      : [ruta];
  });
}

const rutasEs = rutas(es as Json).sort();
const otros: ReadonlyArray<readonly [string, Json]> = [
  ["en", en as Json],
  ["pt", pt as Json],
  ["it", itDict as Json],
];

describe("paridad de diccionarios", () => {
  it.each(otros)("%s tiene exactamente las mismas claves que es", (_lang, dict) => {
    const suyas = rutas(dict).sort();
    // `toEqual` sobre los arrays ordenados reporta de una qué falta y qué sobra,
    // que es más útil que un conteo.
    expect(suyas).toEqual(rutasEs);
  });

  it.each(otros)("%s no deja ningún texto vacío", (_lang, dict) => {
    const vacias = rutas(dict).filter((ruta) => {
      const valor = ruta.split(".").reduce<unknown>(
        (acc, parte) => (acc as Json)?.[parte],
        dict
      );
      return typeof valor === "string" && valor.trim() === "";
    });
    expect(vacias).toEqual([]);
  });

  it("el español no quedó vacío en ninguna clave", () => {
    expect(rutasEs.length).toBeGreaterThan(300);
  });
});

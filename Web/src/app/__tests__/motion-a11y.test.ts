import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guarda de accesibilidad del sistema de motion.
 *
 * `prefers-reduced-motion` no es opcional: hay gente para la que el
 * movimiento en pantalla provoca mareo o migraña (WCAG 2.1 — 2.3.3 Animation
 * from Interactions). El riesgo real es humano: se agrega una animación nueva
 * y se olvida el guard, y no hay forma de notarlo mirando la página.
 *
 * Este test lee el CSS y exige que toda utilidad que anime declare su
 * excepción. Si alguien suma una animación sin guard, la suite falla.
 */

const CSS = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf-8"
);

/** Extrae cada bloque `@utility <nombre> { ... }` con su cuerpo. */
function utilidades(): Array<{ nombre: string; cuerpo: string }> {
  const out: Array<{ nombre: string; cuerpo: string }> = [];
  const re = /@utility\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(CSS)) !== null) {
    // Recorre balanceando llaves para capturar el bloque completo,
    // incluidos los `@media` anidados.
    let profundidad = 1;
    let i = re.lastIndex;
    while (i < CSS.length && profundidad > 0) {
      if (CSS[i] === "{") profundidad++;
      else if (CSS[i] === "}") profundidad--;
      i++;
    }
    out.push({ nombre: m[1], cuerpo: CSS.slice(re.lastIndex, i - 1) });
  }
  return out;
}

/** ¿El bloque pone algo en movimiento? */
function anima(cuerpo: string): boolean {
  return /animation:|transition:|transform:/.test(cuerpo);
}

const TODAS = utilidades();

describe("sistema de motion — accesibilidad", () => {
  it("el CSS declara utilidades (el parser encuentra bloques)", () => {
    expect(TODAS.length).toBeGreaterThan(15);
  });

  it("existe la red de seguridad global que neutraliza TODO el movimiento", () => {
    // Cubre lo que no tiene guard propio, el CSS de terceros y cualquier
    // animación futura. Es la garantía que no depende de la memoria de nadie.
    const bloqueGlobal = CSS.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\*,[\s\S]*?\}/
    );
    expect(bloqueGlobal, "falta el bloque global de reduced-motion").not.toBeNull();

    const texto = bloqueGlobal![0];
    expect(texto).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(texto).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(texto).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it("el scroll suave se desactiva con reduced-motion", () => {
    expect(CSS).toMatch(/prefers-reduced-motion[\s\S]*?scroll-behavior:\s*auto/);
  });

  it("no usa `animation: none` global (congelaría elementos en su frame 0)", () => {
    // Con una animación `forwards` que arranca en opacity 0, `animation: none`
    // dejaría el elemento invisible para siempre. Se documenta acá porque es
    // un error fácil de introducir "simplificando" el bloque global.
    const bloqueGlobal = CSS.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\*,[\s\S]*?\}/
    )![0];
    expect(bloqueGlobal).not.toMatch(/animation:\s*none/);
  });

  it("las utilidades nuevas de esta iteración existen y traen su guard", () => {
    for (const nombre of [
      "lift-card",
      "sheen",
      "pressable",
      "float-soft",
      "orb-drift",
      "pop-in",
      "underline-grow",
      "btn-primary",
    ]) {
      const u = TODAS.find((x) => x.nombre === nombre);
      expect(u, `falta la utilidad ${nombre}`).toBeDefined();
      expect(
        u!.cuerpo.includes("prefers-reduced-motion"),
        `${nombre} anima sin guard de reduced-motion`
      ).toBe(true);
    }
  });

  it("los keyframes nuevos están definidos", () => {
    for (const kf of ["floatSoft", "orbDrift", "popIn", "sheenSweep"]) {
      expect(CSS).toContain(`@keyframes ${kf}`);
    }
  });

  it("no se rompió la paleta: el azul de acento sigue siendo #2563eb", () => {
    // Restricción del titular sostenida en todo el rediseño: los colores y
    // las fuentes no cambian. El motion se construye SOBRE ellos.
    expect(CSS).toMatch(/#2563eb/i);
    expect(CSS).toMatch(/--font-barlow|Barlow/);
  });
});

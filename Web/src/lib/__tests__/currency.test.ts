import { describe, it, expect } from 'vitest';
import { formatCurrencyString } from '../currency';

describe('Financial Formatters (Zero Trust v4.0)', () => {

  describe('Formateo Visual de Interfaz (Sufijos de Moneda)', () => {

    it('debe devolver el valor formateado correctamente para Pesos Argentinos (ARS)', () => {
      const formattedARS = formatCurrencyString(1425000, 'ARS');

      // Verifica que inicie con el símbolo y contenga los separadores
      expect(formattedARS).toMatch(/1.*425.*000/);
      // Verifica estrictamente que la cadena termine con el código de la moneda
      expect(formattedARS.endsWith('ARS')).toBe(true);
    });

    it('debe devolver el valor formateado correctamente para Dólares (USD)', () => {
      const formattedUSD = formatCurrencyString(1000, 'USD');

      expect(formattedUSD).toContain('$');
      expect(formattedUSD).toMatch(/1.*000/);
      expect(formattedUSD.endsWith('USD')).toBe(true);
    });

    it('debe devolver el valor formateado con precisión decimal para Reales (BRL)', () => {
      const formattedBRL = formatCurrencyString(5000.50, 'BRL');

      expect(formattedBRL).toMatch(/5.*000/);
      // BRL está configurado para tener 2 decimales
      expect(formattedBRL).toContain('50');
      expect(formattedBRL.endsWith('BRL')).toBe(true);
    });

    it('debe manejar valores nulos o indefinidos con seguridad perimetral', () => {
      const formattedNull = formatCurrencyString(null as unknown as number, 'USD');
      expect(formattedNull).toBe('--');
    });

    it('debe degradar a USD ante códigos de moneda inválidos (sin lanzar RangeError)', () => {
      // "AR$" haría explotar Intl.NumberFormat si no se sanitizara
      const formattedInvalid = formatCurrencyString(1000, 'AR$');
      expect(formattedInvalid.endsWith('USD')).toBe(true);
      expect(formattedInvalid).toMatch(/1.*000/);
    });

  });
});
/**
 * Monedas fuera del mapa soportado.
 *
 * Antes se degradaban a USD —código incluido—, así que 500 libras se mostraban
 * como "$500 USD": el número correcto con la divisa equivocada, que es
 * tergiversar el precio. Solo Impact declara `currency` en su feed; Rakuten,
 * Awin y CJ dependen del mapa país→moneda, y Awin cubre Reino Unido.
 */
describe("monedas no soportadas", () => {
  it("NUNCA presenta otra divisa como dólares", () => {
    const salida = formatCurrencyString(500, "GBP");
    expect(salida).toContain("GBP");
    expect(salida).not.toContain("USD");
    expect(salida).not.toContain("$");
  });

  it("conserva el importe intacto", () => {
    expect(formatCurrencyString(1234.5, "GBP")).toContain("1,234.5");
  });

  it("acepta cualquier código ISO-4217 de 3 letras", () => {
    for (const c of ["GBP", "CAD", "JPY", "CHF"]) {
      expect(formatCurrencyString(10, c)).toContain(c);
    }
  });

  it("cae a USD solo ante basura que no es un código", () => {
    // "AR$" o vacío no son divisas: ahí el default histórico es lo razonable.
    expect(formatCurrencyString(10, "AR$")).toContain("USD");
    expect(formatCurrencyString(10, "")).toContain("USD");
  });

  it("no rompe el render con un código inválido (era el motivo del guard)", () => {
    expect(() => formatCurrencyString(10, "XX")).not.toThrow();
    expect(() => formatCurrencyString(10, "!!!")).not.toThrow();
  });

  it("las monedas soportadas siguen igual que antes", () => {
    expect(formatCurrencyString(1000, "ARS")).toContain("ARS");
    expect(formatCurrencyString(1000, "USD")).toContain("USD");
    expect(formatCurrencyString(1000, "EUR")).toContain("EUR");
  });
});

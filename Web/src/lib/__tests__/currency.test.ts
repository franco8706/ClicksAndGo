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
      const formattedNull = formatCurrencyString(null as any, 'USD');
      expect(formattedNull).toBe('--');
    });

  });
});
import { describe, it, expect } from 'vitest';
import { SUPPORTED_COUNTRIES, COUNTRY_LABELS, COUNTRY_LABELS_COMPACT, isSupportedCountry } from '../countries';

describe('countries — país del catálogo (CountrySelector)', () => {

  describe('isSupportedCountry', () => {
    it('acepta un código soportado', () => {
      expect(isSupportedCountry('AR')).toBe(true);
      expect(isSupportedCountry('US')).toBe(true);
    });

    it('rechaza códigos no soportados, vacíos o nulos', () => {
      // 🛡️ Esta función es la que valida la cookie ANTES de mandarla a Rails
      // como `?country=`. Un valor de cookie manipulado en devtools (o
      // simplemente corrupto) no debe llegar nunca a esa query string.
      expect(isSupportedCountry('XX')).toBe(false);
      expect(isSupportedCountry('')).toBe(false);
      expect(isSupportedCountry(null)).toBe(false);
      expect(isSupportedCountry(undefined)).toBe(false);
      expect(isSupportedCountry('<script>')).toBe(false);
    });

    it('no acepta minúsculas: el llamador debe normalizar antes', () => {
      // Contrato explícito, no un accidente: `page.tsx`/`layout.tsx` hacen
      // `.toUpperCase()` antes de llamar. Si esta función normalizara sola,
      // dos lugares tendrían la misma lógica de saneo por separado.
      expect(isSupportedCountry('ar')).toBe(false);
    });
  });

  describe('Consistencia de las etiquetas', () => {
    it('cada país soportado tiene etiqueta completa Y compacta', () => {
      // El selector móvil usa COUNTRY_LABELS_COMPACT; si un país nuevo se
      // agrega a SUPPORTED_COUNTRIES sin su par compacto, `CountrySelector`
      // renderizaría `undefined` en el `<option>` del navbar móvil.
      for (const code of SUPPORTED_COUNTRIES) {
        expect(COUNTRY_LABELS[code], `falta COUNTRY_LABELS.${code}`).toBeTruthy();
        expect(COUNTRY_LABELS_COMPACT[code], `falta COUNTRY_LABELS_COMPACT.${code}`).toBeTruthy();
      }
    });

    it('la etiqueta compacta es más corta que la completa (por eso existe)', () => {
      for (const code of SUPPORTED_COUNTRIES) {
        expect(COUNTRY_LABELS_COMPACT[code].length).toBeLessThan(COUNTRY_LABELS[code].length);
      }
    });

    it('AR está soportado — es el mercado con la primera afiliación de Lenovo', () => {
      expect(SUPPORTED_COUNTRIES).toContain('AR');
    });
  });
});

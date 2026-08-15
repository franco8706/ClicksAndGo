import { describe, it, expect } from 'vitest';
import { isAllowedOutUrl } from '../proxy';

/**
 * El allowlist de `/out` decide si un clic en "Comprar" llega a la tienda o
 * rebota al home. Un dominio faltante NO rompe nada visible: el visitante
 * vuelve a la portada y la comisión simplemente no ocurre.
 *
 * Pasó de verdad, y por meses: `click.linksynergy.com` (Rakuten, ~880 ofertas
 * por ciclo) y `lenovo-argentina.5nfc.net` (Impact, 264 productos) nunca
 * estuvieron en la lista. Medido en producción el 2026-08-15: ambos
 * devolvían 307 → clicks-and-go.com/es.
 *
 * Estos tests fijan los redirectores REALES observados en el catálogo. Al
 * sumar una red nueva en Python, agregar acá su host antes de dar por
 * integrada la red.
 */
describe('/out — allowlist de dominios de salida', () => {

  describe('Redirectores de las redes con afiliación viva', () => {
    it.each([
      ['Rakuten / Newegg',  'https://click.linksynergy.com/deeplink?id=x&mid=1&murl=https%3A%2F%2Fwww.newegg.com%2Fp%2F1'],
      ['Impact / Lenovo AR', 'https://lenovo-argentina.5nfc.net/c/7514506/594670/9491?u=https%3A%2F%2Fwww.lenovo.com'],
      ['Amazon US',          'https://www.amazon.com/dp/B0TEST'],
    ])('permite %s', (_red, url) => {
      expect(isAllowedOutUrl(url)).toBe(true);
    });
  });

  describe('Anti open-redirect (el motivo por el que el allowlist existe)', () => {
    it.each([
      ['dominio arbitrario',        'https://evil.example.com/phishing'],
      ['sufijo engañoso',           'https://evil-lenovo.com/fake'],
      ['sufijo sobre red legítima', 'https://notlinksynergy.com/x'],
      ['protocolo javascript',      'javascript:alert(1)'],
      ['data URI',                  'data:text/html,<script>alert(1)</script>'],
      ['URL no parseable',          'no-es-una-url'],
      ['vacío',                     ''],
    ])('rechaza %s', (_caso, url) => {
      expect(isAllowedOutUrl(url)).toBe(false);
    });

    it('permite subdominios legítimos pero no dominios que solo terminan parecido', () => {
      expect(isAllowedOutUrl('https://store.lenovo.com/p/1')).toBe(true);
      // `endsWith('.lenovo.com')` protege de esto; `endsWith('lenovo.com')` no.
      expect(isAllowedOutUrl('https://xlenovo.com/p/1')).toBe(false);
    });
  });
});

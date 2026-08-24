import { describe, it, expect } from 'vitest';
import { isAllowedOutUrl } from '../proxy';

/**
 * 🔗 Auditoría del allowlist contra los hosts REALES del catálogo.
 *
 * `/out` es la única puerta por la que sale un clic hacia la tienda. Si el
 * host de un producto no está en `ALLOWED_OUT_DOMAINS`, el botón "Comprar"
 * devuelve al visitante al home y la comisión se pierde — sin ningún error
 * visible en el sitio. Ya pasó dos veces: `linksynergy.com` dejó muertos los
 * ~880 productos de Rakuten y `5nfc.net` los 276 de Lenovo Argentina.
 *
 * La lista de abajo es el `SELECT DISTINCT host FROM laptops` de producción
 * al 2026-08-24, con la cantidad de productos que cuelga de cada uno. Cuando
 * se sume un retailer nuevo hay que agregar su host acá Y en el allowlist:
 * este test es el que avisa si se olvidó uno de los dos.
 */
const HOSTS_DEL_CATALOGO: ReadonlyArray<readonly [string, number]> = [
  ['click.linksynergy.com', 8173],   // Rakuten → Newegg
  ['lenovo-argentina.5nfc.net', 276], // Impact → Lenovo AR
  ['www.lenovo.com', 13],
  ['www.hp.com', 13],
  ['www.amazon.com', 12],
  ['www.dell.com', 7],
  ['www.asus.com', 6],
  ['www.bestbuy.com', 5],
  ['www.apple.com', 4],
  ['www.amazon.es', 3],
  ['www.acer.com', 2],
  ['www.mercadolibre.com.mx', 2],
  ['us.msi.com', 1],
  ['la.msi.com', 1],
  ['www.razer.com', 1],
];

describe('allowlist de /out vs. catálogo real', () => {
  it.each(HOSTS_DEL_CATALOGO)(
    'deja pasar %s (%i productos)',
    (host, productos) => {
      const permitido = isAllowedOutUrl(`https://${host}/producto/x?tag=abc`);
      expect(
        permitido,
        `${productos} producto(s) apuntan a ${host} y /out los rechaza: ` +
          `el botón de compra devuelve al home y no hay comisión posible. ` +
          `Agregá el dominio a ALLOWED_OUT_DOMAINS en proxy.ts.`
      ).toBe(true);
    }
  );

  it('sigue rechazando un dominio que solo IMITA a uno permitido', () => {
    // La guarda que hace que el allowlist sirva de algo.
    expect(isAllowedOutUrl('https://evil-lenovo.com/x')).toBe(false);
    expect(isAllowedOutUrl('https://lenovo.com.attacker.net/x')).toBe(false);
  });
});

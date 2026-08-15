/**
 * Países que Rails sirve catálogo — espejo de `SUPPORTED_COUNTRIES` en
 * `proxy.ts`. Se duplica a propósito en vez de importar: `proxy.ts` corre en
 * el runtime del proxy y este archivo lo consumen componentes de cliente, y
 * mezclar esos dos mundos en un import cruzado es más frágil que mantener dos
 * listas cortas sincronizadas a mano.
 */
export const SUPPORTED_COUNTRIES = ["AR", "ES", "US", "MX", "BR", "CO", "CL", "IT"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export function isSupportedCountry(code: string | null | undefined): code is SupportedCountry {
  return !!code && (SUPPORTED_COUNTRIES as readonly string[]).includes(code);
}

export const COUNTRY_LABELS: Record<SupportedCountry, string> = {
  AR: "🇦🇷 Argentina",
  ES: "🇪🇸 España",
  US: "🇺🇸 Estados Unidos",
  MX: "🇲🇽 México",
  BR: "🇧🇷 Brasil",
  CO: "🇨🇴 Colombia",
  CL: "🇨🇱 Chile",
  IT: "🇮🇹 Italia",
};

/** Variante angosta (bandera + código) para el navbar móvil — ver
 *  `CountrySelector`. El nombre completo no entra: a 375px de ancho el
 *  navbar ya está al límite solo con logo + selector de idioma + botón. */
export const COUNTRY_LABELS_COMPACT: Record<SupportedCountry, string> = {
  AR: "🇦🇷 AR",
  ES: "🇪🇸 ES",
  US: "🇺🇸 US",
  MX: "🇲🇽 MX",
  BR: "🇧🇷 BR",
  CO: "🇨🇴 CO",
  CL: "🇨🇱 CL",
  IT: "🇮🇹 IT",
};

/** Nombre de la cookie donde el visitante anónimo guarda su elección. */
export const COUNTRY_COOKIE = "preferred_country";

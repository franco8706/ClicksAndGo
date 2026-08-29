/**
 * =====================================================================
 * 💱 Formateador Financiero Zero-Trust - Clicks & Go v4.0
 * Únicamente da formato visual a precios que YA VIENEN calculados
 * y localizados desde el Guardián de Persistencia (Rails/PostgreSQL).
 * =====================================================================
 */

import { CurrencyCode } from '@/types/laptop';

interface CurrencyConfig {
  readonly locale: string;
  readonly maxDigits: number;
}

// Mapa de configuración centralizado (Single Source of Truth)
const CURRENCY_MAP: Record<CurrencyCode, CurrencyConfig> = {
  USD: { locale: 'en-US', maxDigits: 0 },
  EUR: { locale: 'es-ES', maxDigits: 0 },
  ARS: { locale: 'es-AR', maxDigits: 0 },
  MXN: { locale: 'es-MX', maxDigits: 0 },
  BRL: { locale: 'pt-BR', maxDigits: 2 },
  COP: { locale: 'es-CO', maxDigits: 0 },
  CLP: { locale: 'es-CL', maxDigits: 0 },
};

// 🚀 SUPREMA OPTIMIZACIÓN SÉNIOR: Registro de formateadores para evitar re-alojamiento en memoria (Garbage Collection)
const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Convierte un valor numérico en una cadena String formateada de forma segura.
 * Utiliza caché estático para garantizar renderizado de latencia cero en el Frontend.
 */
export function formatCurrencyString(amount: number, currencyCode: string): string {
  if (amount === undefined || amount === null) return "--";

  // 🛡️ Sanitización: un código fuera del mapa (ej. "AR$", "XX") haría que
  // Intl.NumberFormat lance RangeError y rompa el render de la card.
  //
  // ⚠️ Antes, una moneda no soportada se degradaba A USD — código incluido.
  // Es decir: un precio de 500 libras se mostraba como "$500 USD". El número
  // correcto con la moneda equivocada es una tergiversación del precio, no una
  // degradación elegante: el visitante ve un valor ~27% menor y en la divisa
  // de otro país. Va contra el mismo criterio que ya rige en este proyecto
  // para el claim de descuento y para las fotos de stock.
  //
  // No es hipotético: solo Impact declara `currency` en su feed; Rakuten, Awin
  // y CJ dependen del mapa país→moneda de `data_normalizer.py`. Awin cubre
  // Reino Unido y Alemania, así que un GBP entra en cuanto se sume ese mercado.
  //
  // Ahora se formatea el número de forma neutra y se muestra el código REAL.
  // Se ve menos pulido que un símbolo, y es la única opción honesta.
  const requested = (currencyCode || 'USD').toUpperCase().trim();

  if (!(requested in CURRENCY_MAP)) {
    // Código plausible (3 letras ISO-4217) → se respeta tal cual.
    // Basura ("AR$", "") → se cae a USD, que es el default histórico.
    const esCodigoPlausible = /^[A-Z]{3}$/.test(requested);
    const codigo = esCodigoPlausible ? requested : 'USD';
    const numero = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(amount);
    return `${numero} ${codigo}`;
  }

  const targetCurrency = requested as CurrencyCode;
  const config = CURRENCY_MAP[targetCurrency];

  // Generamos una llave única para el caché basada en la configuración regional
  const cacheKey = `${config.locale}-${targetCurrency}-${config.maxDigits}`;

  let formatter = formatterCache.get(cacheKey);

  // Si no existe en el mapa, lo instanciamos una única vez de forma perezosa (Lazy Loading)
  if (!formatter) {
    formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: config.maxDigits,
    });
    formatterCache.set(cacheKey, formatter);
  }

  const formattedValue = formatter.format(amount);

  /**
   * 🛡️ CONCATENACIÓN VISUAL ANTI-FRAUDE:
   * Mantiene el look limpio y estricto requerido por el ecosistema.
   */
  return `${formattedValue} ${targetCurrency}`;
}
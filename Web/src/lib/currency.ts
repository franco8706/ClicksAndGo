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

  const targetCurrency = (currencyCode || 'USD').toUpperCase().trim() as CurrencyCode;
  const config = CURRENCY_MAP[targetCurrency] || CURRENCY_MAP.USD;

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
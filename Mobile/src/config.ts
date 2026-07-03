// =====================================================================
// ⚙️ CONFIGURACIÓN DE ENTORNO — App móvil Clicks & Go
// Cambiar estas URLs según el entorno:
//  - Desarrollo: IP local de tu máquina (el emulador/celular debe alcanzarla)
//  - Producción: dominio público del deploy en AWS
// =====================================================================

// API de Rails (catálogo, noticias, geo)
export const API_BASE_URL = "http://localhost:3000";

// Web pública — usada para el gateway de afiliados /out.
// ⚠️ IMPORTANTE: las compras SIEMPRE salen por el gateway de la web,
// que valida dominios (allowlist) e inyecta los tags de afiliado.
// Nunca abrir laptop.urls.affiliate_raw directo: se pierde la comisión.
export const WEB_BASE_URL = "http://localhost:8081";

export const SUPPORTED_COUNTRIES = ["AR", "ES", "US", "MX", "BR", "CO", "CL"] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

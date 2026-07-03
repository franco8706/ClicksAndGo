// =====================================================================
// 🌍 i18n MÍNIMO — es / en / pt (espejo reducido de los diccionarios web)
// El idioma se elige automáticamente según el país (GET /api/v1/geo).
// =====================================================================

export type Locale = "es" | "en" | "pt";

interface Dict {
  catalogTitle: string;
  catalogSubtitle: string;
  newsTitle: string;
  buyAt: string;
  verifiedPrice: string;
  usdRef: string;
  unavailable: string;
  loading: string;
  error: string;
  retry: string;
  region: string;
  tabCatalog: string;
  tabNews: string;
  affiliateNote: string;
}

export const DICTS: Record<Locale, Dict> = {
  es: {
    catalogTitle: "Laptops",
    catalogSubtitle: "El mejor precio para tu región",
    newsTitle: "Noticias de Tecnología",
    buyAt: "Comprar en",
    verifiedPrice: "Precio verificado",
    usdRef: "Ref",
    unavailable: "No disponible",
    loading: "Cargando…",
    error: "No pudimos cargar los datos",
    retry: "Reintentar",
    region: "Región",
    tabCatalog: "Catálogo",
    tabNews: "Noticias",
    affiliateNote: "Este sitio contiene enlaces de afiliados. Podemos recibir una comisión sin costo extra para vos.",
  },
  en: {
    catalogTitle: "Laptops",
    catalogSubtitle: "The best price for your region",
    newsTitle: "Tech News",
    buyAt: "Buy at",
    verifiedPrice: "Verified price",
    usdRef: "Ref",
    unavailable: "Unavailable",
    loading: "Loading…",
    error: "We couldn't load the data",
    retry: "Retry",
    region: "Region",
    tabCatalog: "Catalog",
    tabNews: "News",
    affiliateNote: "This app contains affiliate links. We may earn a commission at no extra cost to you.",
  },
  pt: {
    catalogTitle: "Notebooks",
    catalogSubtitle: "O melhor preço para a sua região",
    newsTitle: "Notícias de Tecnologia",
    buyAt: "Comprar na",
    verifiedPrice: "Preço verificado",
    usdRef: "Ref",
    unavailable: "Indisponível",
    loading: "Carregando…",
    error: "Não foi possível carregar os dados",
    retry: "Tentar novamente",
    region: "Região",
    tabCatalog: "Catálogo",
    tabNews: "Notícias",
    affiliateNote: "Este app contém links de afiliados. Podemos receber uma comissão sem custo extra para você.",
  },
};

import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductImage from "@/components/ProductImage";
import { Cpu, Box, HardDrive, ChevronLeft, ShoppingCart, Globe, Zap } from "lucide-react";

import { formatCurrencyString } from "@/lib/currency";
import { displayTitle, normalizeBrand, splitTitle, seoTitle, buildMetaDescription, isIndexableProduct } from "@/lib/productSeo";
import { Laptop } from "@/types/laptop";
import { SPEC_SCHEMA, specSchemaFor, formatSpec, type ProductType } from "@/types/product";

import es from "@/dictionaries/es.json";
import en from "@/dictionaries/en.json";
import pt from "@/dictionaries/pt.json";
import it from "@/dictionaries/it.json";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/** ⏱️ Techo de espera a Rails — ver la nota en page.tsx del home. */
const RAILS_TIMEOUT_MS = 8_000;

// Misma resolución que `layout.tsx` y `sitemap.ts` — una sola fuente de verdad
// para el dominio público. Si estos tres divergieran, Google recibiría
// canonical y hreflang apuntando a hosts distintos para la misma página.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://clicks-web-2myrvivvhq-uc.a.run.app"
).replace(/\/$/, "");

async function getLaptopData(slug: string): Promise<Laptop | null> {
  const railsApiUrl = process.env.RAILS_API_URL || 'http://rails_backend:3000';
  try {
    const res = await fetch(`${railsApiUrl}/api/v1/notebooks?slug=${encodeURIComponent(slug)}&limit=1`, {
      next: { revalidate: 60, tags: [`laptop-${slug}`] },
      signal: AbortSignal.timeout(RAILS_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0] : null; // 🚀 Corregido aquí: data[0] con corchetes
  } catch {
    // Silencia el error en fase de construcción Docker si el Backend está offline
    console.warn(`⚠️ [Next.js Build] No se pudo conectar al Backend para el slug "${slug}". Usando fallback.`);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const laptop = await getLaptopData(slug);
    if (!laptop) return { title: "Laptop | Clicks & Go" };
    /* 🔍 Título y descripción — ver `productSeo.ts` para el porqué.
     *
     * El título se armaba `${brand} ${name}`, que con el feed de Rakuten daba
     * "Viewsonic ViewSonic VX1655…" (13,5% del catálogo) y "Genérica …" en el
     * 66% donde el extractor de marca no reconoce nada. La descripción caía a
     * `"Análisis experto para {nombre}"`, idéntica en las 2585 fichas y
     * prometiendo un análisis que la página no tiene. */

    /* 🚫 Commodities fuera del índice. No se sacan del sitio —se navegan y
     * monetizan igual—, solo se deja de pedirle rastreo a Google para un cable
     * de corriente genérico que no puede posicionar contra Amazon. Va junto
     * con la exclusión del sitemap: listar en el sitemap una URL `noindex` es
     * mandar señales contradictorias. */
    const indexable = isIndexableProduct({ product_type: laptop.product_type, name: laptop.name });

    return {
      title: laptop.seo?.title || seoTitle(laptop.brand, laptop.name),
      description:
        laptop.seo?.description ||
        laptop.intelligence?.ai_reasoning ||
        buildMetaDescription(laptop, locale, formatCurrencyString),
      ...(indexable ? {} : { robots: { index: false, follow: true } }),
      // 🔍 Canonical auto-referenciado + hreflang. `metadataBase` viene heredado
      // del layout — ver ahí la nota de por qué hacía falta (Search Console:
      // "Duplicada... ninguna versión canónica").
      //
      // Corrección 2026-07-28: en el commit anterior se omitió el hreflang
      // asumiendo que el país embebido en el slug ("...-us") impedía que el
      // producto existiera en los otros idiomas. **Es falso**: la página
      // resuelve por slug y traduce con el diccionario del locale — se verificó
      // en producción que los 4 idiomas devuelven 200. El slug marca el
      // MERCADO/retailer, no el idioma. Debe declararse igual que en sitemap.ts,
      // o Google recibe señales contradictorias entre el sitemap y la página.
      // ⚠️ `metadataBase` se declara ACÁ, no se hereda del layout.
      //
      // Medido en producción (2026-08-08): la home servía 5 `<link hreflang>`
      // y la ficha de producto servía CERO, con este bloque `alternates` ya
      // escrito y correcto. Sin `metadataBase` en el punto donde se resuelve
      // la metadata, Next no puede convertir estas rutas relativas en URLs
      // absolutas y las **descarta en silencio** — no avisa, no rompe el
      // build, simplemente no emite las etiquetas.
      //
      // Es el mismo fallo que ya había aparecido en el layout, y la misma
      // consecuencia: Search Console reporta "Duplicada: el usuario no ha
      // indicado ninguna versión canónica", porque ve los 4 idiomas del mismo
      // producto sin ninguna señal de que son traducciones entre sí.
      //
      // Verificar SIEMPRE contando `<link hreflang>` en el HTML servido, no
      // leyendo este archivo: el código se veía correcto mientras fallaba.
      metadataBase: new URL(SITE_URL),
      alternates: {
        // URLs ABSOLUTAS, igual que en layout.tsx. No es preferencia de
        // estilo: con rutas relativas Next emitía el `canonical` pero
        // descartaba TODOS los `languages`, incluso con `metadataBase`
        // declarado en esta misma función. Se midió contando
        // `<link hreflang>` en el HTML servido: 5 en la home (que arma
        // absolutas) y 0 en la ficha (que armaba relativas), con el bloque
        // `alternates` escrito y correcto en los dos lados.
        //
        // El síntoma en Search Console es "Duplicada: el usuario no ha
        // indicado ninguna versión canónica": Google ve las 4 traducciones
        // del mismo producto sin ninguna señal de que se corresponden.
        canonical: `${SITE_URL}/${locale}/laptop/${slug}`,
        languages: {
          es: `${SITE_URL}/es/laptop/${slug}`,
          en: `${SITE_URL}/en/laptop/${slug}`,
          pt: `${SITE_URL}/pt/laptop/${slug}`,
          it: `${SITE_URL}/it/laptop/${slug}`,
          "x-default": `${SITE_URL}/en/laptop/${slug}`,
        },
      },
      // 🖼️ OG image solo si hay foto REAL del producto. Sin respaldo de stock:
      // una preview en redes con la foto de otro artículo es tan engañosa como
      // en la card (ver ProductImage.tsx). Sin `images`, la red social usa el
      // OG por defecto del sitio.
      openGraph: laptop.urls?.image ? { images: [laptop.urls.image] } : undefined,
    };
  } catch {
    return { title: "Clicks & Go Enterprise" };
  }
}

export default async function LaptopDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const dict = locale === "en" ? en : locale === "pt" ? pt : locale === "it" ? it : es;

  const laptop = await getLaptopData(slug);
  if (!laptop) notFound();

  const currentPrice = laptop.financials?.current_price || 0;
  const isGranOportunidad = laptop.intelligence?.is_featured_deal || (laptop.intelligence?.deal_score ?? 0) >= 8.5;
  const retailer = laptop.metadata_extra?.retailer || 'generic';

  const localPriceString = formatCurrencyString(currentPrice, laptop.currency);
  const monetizedUrl = `/out?url=${encodeURIComponent(laptop.urls?.affiliate_raw || '#')}&country=${laptop.country_code}`;

  // 📦 Specs por tipo de producto (multi-producto): mismo SPEC_SCHEMA que la card.
  const productType = (laptop.product_type || "laptop") as ProductType;
  const specSchema = specSchemaFor(productType);
  const specSource: Record<string, unknown> =
    laptop.specs && Object.keys(laptop.specs).length > 0
      ? (laptop.specs as Record<string, unknown>)
      : ((laptop.hardware || {}) as Record<string, unknown>);
  const specsDict = (dict.specs ?? {}) as Record<string, string>;
  const specEntries = specSchema.flatMap((f) => {
    const value = formatSpec(f, specSource[f.key]);
    if (!value) return [];
    return [{ key: f.key, label: specsDict[f.labelKey] || f.labelKey, value }];
  });
  const categoryLabel = (dict.categories as Record<string, string> | undefined)?.[productType] || productType;
  const specIcon = (key: string): React.ReactNode => {
    if (key === "cpu") return <Cpu size={20} />;
    if (key === "ram_gb") return <Box size={20} />;
    if (key === "storage_gb" || key === "gpu") return <HardDrive size={20} />;
    return <Zap size={20} />;
  };

  /* 🔍 Datos estructurados schema.org/Product.
   *
   * Sin esto Google ve una página de texto cualquiera: no sabe que hay un
   * producto, ni su precio, ni su moneda, ni su disponibilidad. Es una de las
   * causas de "Rastreada: actualmente sin indexar" en un catálogo — la página
   * existe, se rastrea, pero no aporta nada que valga la pena indexar.
   *
   * Solo se declara lo que el backend realmente tiene:
   *   · `image` únicamente si hay foto REAL (misma regla que ProductImage y
   *     que el OG de arriba). Declarar una imagen de stock como si fuera del
   *     producto es la misma representación engañosa, pero además le miente a
   *     un consumidor automatizado.
   *   · `offers` solo con precio > 0, o Google marca el dato como inválido.
   * Nada se inventa para "completar" el schema. */
  const precio = laptop.financials?.current_price ?? 0;
  /* Mismo criterio que el `<title>` y el H1: sin marca repetida y sin el
   * placeholder "Genérica". Declarar `brand: "Genérica"` en schema.org sería
   * darle a un consumidor automatizado un fabricante que no existe. */
  const marcaLimpia = normalizeBrand(laptop.brand);
  const nombreLimpio = displayTitle(laptop.brand, laptop.name);
  const tituloPartido = splitTitle(laptop.brand, laptop.name);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nombreLimpio,
    ...(laptop.urls?.image ? { image: [laptop.urls.image] } : {}),
    ...(laptop.seo?.description ? { description: laptop.seo.description } : {}),
    ...(marcaLimpia ? { brand: { "@type": "Brand", name: marcaLimpia } } : {}),
    // Sin `sku`: el DTO público no expone `sku_original` y el contrato con
    // Rails es inmutable. Un identificador inventado sería peor que ninguno.
    category: categoryLabel,
    ...(precio > 0
      ? {
          offers: {
            "@type": "Offer",
            price: precio,
            priceCurrency: laptop.currency || "USD",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/${locale}/laptop/${slug}`,
          },
        }
      : {}),
  };

  return (
    <main className="min-h-screen pt-32 pb-20 relative overflow-hidden bg-white">
      <script
        type="application/ld+json"
        // El objeto lo arma el servidor a partir del DTO ya validado por
        // Rails; no hay entrada del usuario en este JSON.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[130px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        <a href={`/${locale}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#6b7280] hover:text-blue-600 mb-10 group transition-colors">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {dict.common?.allLaptops || "Volver al catálogo"}
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className={`relative aspect-square rounded-2xl border border-[#e6e8ec] flex items-center justify-center p-12 overflow-hidden shadow-md bg-[#f5f6f8] ${isGranOportunidad ? "neon-glow border-emerald-300" : ""}`}>
              <ProductImage src={laptop.urls?.image} alt={nombreLimpio} productType={laptop.product_type} quality={85} sizes="(max-width: 768px) 100vw, 50vw" imageClassName="object-contain hover:scale-105 transition-transform duration-500 p-8 drop-shadow-[0_10px_25px_rgba(10,14,20,0.12)]" iconSize={120} />
            </div>

            {laptop.intelligence?.ai_reasoning && (
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-900/20 border border-blue-500/30">
                <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                  <Zap size={22} className="text-amber-300 animate-pulse" />
                  {dict.card?.aiVerdict || "Nuestro análisis"}
                </h3>
                <p className="text-blue-50 font-medium leading-relaxed text-lg">&ldquo;{laptop.intelligence.ai_reasoning}&rdquo;</p>
              </div>
            )}
          </div>

          <div className="space-y-10">
            <header>
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  {retailer}
                </span>
                <span className="px-3 py-1 rounded bg-[#f5f6f8] border border-[#e6e8ec] text-[#6b7280] text-[10px] font-black uppercase tracking-widest">
                  {categoryLabel}
                </span>
              </div>
              {/* H1 de dos líneas sin repetir la marca ni imprimir la que no
                  existe. `splitTitle` la saca del nombre cuando el feed ya la
                  trae dentro —"ViewSonic" sobre "ViewSonic VX1655…"— y
                  devuelve marca vacía para el 66% que llega como "Genérica". */}
              <h1 className="text-5xl md:text-6xl font-black text-[#0a0e14] tracking-tighter leading-[0.95]">
                {tituloPartido.brand && (<>{tituloPartido.brand} <br /></>)}
                <span className="text-blue-600">{tituloPartido.rest}</span>
              </h1>
            </header>

            <div className="p-10 rounded-xl border border-[#e6e8ec] bg-white shadow-md relative overflow-hidden">
              <div className="flex flex-col mb-8">
                <p className="text-xs font-bold text-[#9aa1ac] uppercase tracking-[0.2em] mb-3">
                  {dict.common?.finalPrice || "Precio de referencia"}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-[#0a0e14] tracking-tighter">{localPriceString}</span>
                </div>
              </div>

              <a href={monetizedUrl} target="_blank" rel="sponsored noopener noreferrer" className="btn-primary flex items-center justify-center gap-3 w-full py-5 rounded-[2px] text-white font-black text-xl">
                {dict.common?.viewDeal || "Ir a la Tienda"}
                <ShoppingCart size={22} className="stroke-[2.5]" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {specEntries.map((s) => (
                <SpecItem key={s.key} icon={specIcon(s.key)} label={s.label} value={s.value} />
              ))}
              <SpecItem icon={<Globe size={20} />} label={dict.common?.soldBy || "Distribuidor"} value={retailer} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SpecItem({ icon, label, value }: { readonly icon: React.ReactNode; readonly label: string; readonly value: string }) {
  return (
    <div className="p-6 rounded-lg border border-[#e6e8ec] bg-[#f5f6f8] flex items-center gap-4 hover:bg-[#eef0f3]">
      <div className="text-blue-600 bg-white w-12 h-12 rounded flex items-center justify-center border border-[#e6e8ec] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-[#9aa1ac] uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-bold text-[#0a0e14] truncate">{value}</p>
      </div>
    </div>
  );
}


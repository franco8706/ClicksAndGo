import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductImage from "@/components/ProductImage";
import { Cpu, Box, HardDrive, ChevronLeft, ShoppingCart, Globe, Zap } from "lucide-react";

import { formatCurrencyString } from "@/lib/currency";
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
    return {
      title: laptop.seo?.title || `${laptop.brand} ${laptop.name} - Clicks & Go`,
      description: laptop.seo?.description || laptop.intelligence?.ai_reasoning || `Análisis experto para ${laptop.name}.`,
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
      alternates: {
        canonical: `/${locale}/laptop/${slug}`,
        languages: {
          es: `/es/laptop/${slug}`,
          en: `/en/laptop/${slug}`,
          pt: `/pt/laptop/${slug}`,
          it: `/it/laptop/${slug}`,
          "x-default": `/en/laptop/${slug}`,
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

  return (
    <main className="min-h-screen pt-32 pb-20 relative overflow-hidden bg-white">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[130px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        <a href={`/${locale}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#6b7280] hover:text-blue-600 mb-10 group transition-colors">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {dict.common?.allLaptops || "Volver al catálogo"}
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className={`relative aspect-square rounded-2xl border border-[#e6e8ec] flex items-center justify-center p-12 overflow-hidden shadow-md bg-[#f5f6f8] ${isGranOportunidad ? "neon-glow border-emerald-300" : ""}`}>
              <ProductImage src={laptop.urls?.image} alt={`${laptop.brand} ${laptop.name}`} productType={laptop.product_type} quality={95} sizes="(max-width: 768px) 100vw, 50vw" imageClassName="object-contain hover:scale-105 transition-transform duration-500 p-8 drop-shadow-[0_10px_25px_rgba(10,14,20,0.12)]" iconSize={120} />
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
              <h1 className="text-5xl md:text-6xl font-black text-[#0a0e14] tracking-tighter leading-[0.95]">
                {laptop.brand} <br />
                <span className="text-blue-600">{laptop.name}</span>
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


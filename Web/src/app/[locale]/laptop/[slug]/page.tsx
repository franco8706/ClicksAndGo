import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Cpu, Box, HardDrive, ChevronLeft, ShoppingCart, Globe, Zap } from "lucide-react";

import { formatCurrencyString } from "@/lib/currency";
import { Laptop } from "@/types/laptop";

import es from "@/dictionaries/es.json";
import en from "@/dictionaries/en.json";
import pt from "@/dictionaries/pt.json";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=90&auto=format&fit=crop";

async function getLaptopData(slug: string): Promise<Laptop | null> {
  const railsApiUrl = process.env.RAILS_API_URL || 'http://rails_backend:3000';
  try {
    const res = await fetch(`${railsApiUrl}/api/v1/notebooks?slug=${slug}&limit=1`, {
      next: { revalidate: 60, tags: [`laptop-${slug}`] }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? data[0] : null; // 🚀 Corregido aquí: data[0] con corchetes
  } catch (error) {
    // Silencia el error en fase de construcción Docker si el Backend está offline
    console.warn(`⚠️ [Next.js Build] No se pudo conectar al Backend para el slug "${slug}". Usando fallback.`);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const laptop = await getLaptopData(slug);
    if (!laptop) return { title: "Laptop | Clicks & Go" };
    return {
      title: laptop.seo?.title || `${laptop.brand} ${laptop.name} - Clicks & Go`,
      description: laptop.seo?.description || laptop.intelligence?.ai_reasoning || `Análisis experto para ${laptop.name}.`,
      openGraph: { images: [laptop.urls?.image || FALLBACK_IMAGE] },
    };
  } catch (e) {
    return { title: "Clicks & Go Enterprise" };
  }
}

export default async function LaptopDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const dict = locale === "en" ? en : locale === "pt" ? pt : es;

  const laptop = await getLaptopData(slug);
  if (!laptop) notFound();

  const currentPrice = laptop.financials?.current_price || 0;
  const isGranOportunidad = laptop.intelligence?.is_featured_deal || (laptop.intelligence?.deal_score ?? 0) >= 8.5;
  const retailer = laptop.metadata_extra?.retailer || 'generic';
  const imageUrl = (laptop.urls?.image || FALLBACK_IMAGE).replace(/^http:\/\//, 'https://');

  const localPriceString = formatCurrencyString(currentPrice, laptop.currency);
  const monetizedUrl = `/out?url=${encodeURIComponent(laptop.urls?.affiliate_raw || '#')}&country=${laptop.country_code}`;

  return (
    <main className="min-h-screen pt-32 pb-20 relative overflow-hidden bg-[#090d16]">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[130px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        <a href={`/${locale}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-400 mb-10 group transition-colors">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {dict.common?.allLaptops || "Volver al catálogo"}
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className={`relative aspect-square rounded-[2.5rem] border border-gray-800/80 flex items-center justify-center p-12 overflow-hidden shadow-2xl bg-gray-950/20 ${isGranOportunidad ? "neon-glow border-emerald-500/20" : ""}`}>
              <Image src={imageUrl} alt={`${laptop.brand} ${laptop.name}`} fill priority quality={95} sizes="(max-width: 768px) 100vw, 50vw" className="object-contain hover:scale-105 transition-transform duration-500 p-8 drop-shadow-[0_15px_35px_rgba(0,0,0,0.7)]" />
            </div>

            {laptop.intelligence?.ai_reasoning && (
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-900/20 border border-blue-500/30">
                <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                  <Zap size={22} className="text-amber-300 animate-pulse" />
                  {dict.deals?.verified || "Dictamen de la Inteligencia Artificial"}
                </h3>
                <p className="text-blue-50 font-medium leading-relaxed text-lg">&ldquo;{laptop.intelligence.ai_reasoning}&rdquo;</p>
              </div>
            )}
          </div>

          <div className="space-y-10">
            <header>
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                  {retailer}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[0.95]">
                {laptop.brand} <br />
                <span className="text-blue-500">{laptop.name}</span>
              </h1>
            </header>

            <div className="p-10 rounded-[3rem] border border-gray-800/80 bg-gray-900/30 backdrop-blur shadow-2xl relative overflow-hidden">
              <div className="flex flex-col mb-8">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">
                  {dict.common?.finalPrice || "Precio Final Verificado"}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-white tracking-tighter">{localPriceString}</span>
                </div>
              </div>

              <a href={monetizedUrl} target="_blank" rel="sponsored noopener noreferrer" className="btn-primary flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-white font-black text-xl shadow-lg">
                {dict.common?.viewDeal || "Ir a la Tienda"}
                <ShoppingCart size={22} className="stroke-[2.5]" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SpecItem icon={<Cpu size={20} />} label={dict.common?.specs?.processor || "Procesador"} value={laptop.hardware?.cpu} />
              <SpecItem icon={<Box size={20} />} label={dict.common?.specs?.memory || "RAM"} value={`${laptop.hardware?.ram_gb}GB`} />
              <SpecItem icon={<HardDrive size={20} />} label={dict.common?.specs?.storage || "Almacenamiento"} value={`${laptop.hardware?.storage_gb}GB`} />
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
    <div className="p-6 rounded-3xl border border-gray-800/60 bg-gray-900/20 flex items-center gap-4 hover:bg-gray-900/40">
      <div className="text-blue-400 bg-gray-950 w-12 h-12 rounded-xl flex items-center justify-center border border-gray-800/80 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-200 truncate">{value}</p>
      </div>
    </div>
  );
}


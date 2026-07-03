import React from "react";
import { headers } from "next/headers";
import { CheckCircle, Tag, ShieldCheck, Star } from "lucide-react";
import type { Laptop, HardwareNews } from "@/types/laptop";

import HeroSection from "@/components/HeroSection";
import CatalogSection from "@/components/CatalogSection";
import AIDealsSection from "@/components/AIDealsSection";
import HardwareNewsSlider from "@/components/HardwareNewsSlider";

import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

// ── Stats strip ──────────────────────────────────────────────────────────────
function StatsBanner({ dict }: { dict: any }) {
  const stats = [
    { num: dict.stats?.productsNum  || "5",     label: dict.stats?.products  || "Países con cobertura" },
    { num: dict.stats?.enginesNum   || "100%",  label: dict.stats?.engines   || "Siempre gratis" },
    { num: dict.stats?.countriesNum || "Diario",label: dict.stats?.countries || "Actualización de precios" },
    { num: dict.stats?.latencyNum   || "24/7",  label: dict.stats?.latency   || "Siempre disponible" },
  ];
  return (
    <div className="border-b border-gray-800/50 bg-gradient-to-b from-gray-950/60 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-center text-[10px] font-black text-blue-400 uppercase tracking-widest mb-8">
          {dict.stats?.eyebrow || "Por qué elegir Clicks & Go"}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ num, label }) => (
            <div key={label} className="group">
              <div className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
                {num}
              </div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Why trust us ─────────────────────────────────────────────────────────────
function WhyTrustUs({ dict }: { dict: any }) {
  const items = [
    {
      icon:  <CheckCircle size={22} className="text-emerald-400" />,
      title: dict.features?.audit     || "Precios verificados",
      desc:  dict.features?.auditDesc || "Revisamos cada precio antes de mostrártelo.",
    },
    {
      icon:  <Tag size={22} className="text-blue-400" />,
      title: dict.features?.finance     || "Mejor precio del mercado",
      desc:  dict.features?.financeDesc || "Conectamos con tiendas para traerte la oferta más baja.",
    },
    {
      icon:  <ShieldCheck size={22} className="text-indigo-400" />,
      title: dict.features?.security     || "Solo tiendas confiables",
      desc:  dict.features?.securityDesc || "Solo distribuidores y tiendas oficiales verificadas.",
    },
    {
      icon:  <Star size={22} className="text-amber-400" />,
      title: dict.features?.curation     || "Selección para vos",
      desc:  dict.features?.curationDesc || "Filtramos miles de laptops para mostrarte solo las que valen.",
    },
  ];

  return (
    <section className="py-20 border-b border-gray-800/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">
            {dict.features?.eyebrow || "Nuestra promesa"}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-3 tracking-tight">
            {dict.features?.title || "¿Por qué confiar en Clicks & Go?"}
          </h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            {dict.features?.subtitle || "Trabajamos para que no tengas que comparar precios tú mismo"}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group p-7 rounded-2xl bg-gray-900/30 border border-gray-800/70 hover:border-blue-500/30 hover:bg-gray-900/60 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-5 group-hover:border-blue-500/30 transition-colors">
                {icon}
              </div>
              <h3 className="text-white font-black text-sm mb-2">{title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  const headersList = await headers();
  const countryCode = headersList.get("x-country-code") || "US";

  const railsApiUrl  = process.env.RAILS_API_URL || "http://rails_backend:3000";
  const fetchConfig  = { next: { revalidate: 60, tags: [`catalog-${countryCode}`] } };

  const [laptopsRes, newsRes] = await Promise.allSettled([
    fetch(`${railsApiUrl}/api/v1/notebooks?country=${countryCode}&limit=40`, fetchConfig),
    fetch(`${railsApiUrl}/api/v1/notebooks/hardware_news?country=${countryCode}`, fetchConfig),
  ]);

  let laptops: Laptop[] = [];
  if (laptopsRes.status === "fulfilled" && laptopsRes.value.ok) {
    try { laptops = await laptopsRes.value.json(); } catch (e) { console.error("Laptops parse error:", e); }
  }

  // Fallback to US catalog if local region is empty
  if (laptops.length === 0 && countryCode !== "US") {
    const fb = await fetch(`${railsApiUrl}/api/v1/notebooks?country=US&limit=40`, fetchConfig);
    if (fb.ok) laptops = await fb.json();
  }

  let news: HardwareNews[] = [];
  if (newsRes.status === "fulfilled" && newsRes.value.ok) {
    try { news = await newsRes.value.json(); } catch (e) { console.error("News parse error:", e); }
  }

  return (
    <main className="min-h-screen pb-0 font-sans relative overflow-hidden bg-[#090d16]">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 1. Hero */}
      <HeroSection dict={dict} />

      {/* 2. Radar de noticias geolocalizado — arriba, estilo NVIDIA.
          Cambia según la ubicación (país) detectada del visitante. */}
      {news.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div id="noticias" className="scroll-mt-28">
            <HardwareNewsSlider news={news} dict={dict} />
          </div>
        </section>
      )}

      {/* 3. Stats */}
      <StatsBanner dict={dict} />

      {/* 3. Why trust us — arriba del catálogo, abajo del buscador */}
      <div className="relative z-10 mt-4">
        <WhyTrustUs dict={dict} />
      </div>

      {/* 4. Laptop catalog with filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div id="productos" className="mt-6 mb-8 scroll-mt-28">
          <div className="mb-8">
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">
              {dict.catalog?.eyebrow || "Lo mejor disponible"}
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white mt-2 tracking-tight">
              {dict.catalog?.title || "Laptops"}
            </h2>
            <p className="text-gray-400 text-sm mt-3">
              {dict.catalog?.subtitle || "El mejor precio encontrado para cada modelo en tu región"}{" "}
              <span className="text-blue-400 font-bold">({countryCode})</span>
            </p>
          </div>

          <CatalogSection
            laptops={laptops}
            countryCode={countryCode}
            dict={dict}
            locale={locale}
          />
        </div>
      </section>

      {/* 5. Mejores Ofertas — accesible desde el navbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 py-16 border-t border-gray-800/40">
        <div id="ofertas" className="scroll-mt-28">
          <AIDealsSection laptops={laptops} countryCode={countryCode} dict={dict} />
        </div>
      </section>
    </main>
  );
}

"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Search, X, Briefcase, Video, Gamepad2,
  GraduationCap, Zap, Laptop, ChevronDown, ChevronRight,
} from "lucide-react";
import type { SearchSuggestion, HardwareNews } from "@/types/laptop";

/* ── Iconos por categoría ── */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  gaming:      <Gamepad2      size={16} className="text-blue-400" />,
  business:    <Briefcase     size={16} className="text-blue-400" />,
  workstation: <Zap           size={16} className="text-blue-400" />,
  ultrabook:   <Laptop        size={16} className="text-blue-400" />,
  budget:      <GraduationCap size={16} className="text-blue-400" />,
  creator:     <Video         size={16} className="text-blue-400" />,
};

const SUGGESTIONS: SearchSuggestion[] = [
  { query: "Laptop para jugar juegos pesados",   category: "gaming",      result_counts: 12 },
  { query: "Laptop ligera para la oficina",       category: "business",    result_counts: 8  },
  { query: "Potencia máxima para programar",      category: "workstation", result_counts: 4  },
  { query: "Laptop económica para estudiar",      category: "budget",      result_counts: 23 },
  { query: "Notebook para edición de video 4K",  category: "creator",     result_counts: 7  },
];

/* Fallback si no hay noticias del API */
const STATIC_TICKER: { source: string; headline: string; url?: string }[] = [
  { source: "Gaming",      headline: "RTX 5090 bate récords en juegos 4K" },
  { source: "IA",          headline: "NPUs integrados procesan IA sin conexión" },
  { source: "Ultrabooks",  headline: "M4 Max: autonomía imbatible 22 hrs" },
  { source: "Precios",     headline: "Laptops RTX 4060 desde $799 USD" },
  { source: "Workstation", headline: "Dell Precision 5690 domina render 3D" },
  { source: "ARM",         headline: "Snapdragon X Elite redefine Windows" },
  { source: "Ofertas",     headline: "Mejores deals analizados esta semana" },
  { source: "Data Center", headline: "NVIDIA GB300 llega a portátiles pro" },
];

/* ─────────────────────────────────────────────────────────
   Buscador predictivo — flat-style con glow azul
───────────────────────────────────────────────────────── */
function PredictiveSearch({ dict }: { readonly dict: any }) {
  const [query, setQuery]       = useState("");
  const [isFocused, setFocused] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return SUGGESTIONS.filter((s) => s.query.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const isOpen = isFocused && query.length > 0 && filtered.length > 0;

  const handleSelect = (s: SearchSuggestion) => {
    setQuery(s.query);
    setFocused(false);
    inputRef.current?.blur();
    window.dispatchEvent(new CustomEvent("catalog:filter", { detail: { category: s.category } }));
    setTimeout(() => {
      document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Input flat-style — borde inferior + glow azul al enfocar */}
      <div
        className={`relative flex items-center transition-all duration-300 border-b-2
          ${isFocused ? "border-blue-500 bg-blue-950/20" : "border-white/25 bg-white/3"}`}
        style={isFocused ? { boxShadow: "0 4px 24px rgba(59,130,246,0.2)" } : {}}
      >
        <Search
          size={20}
          className={`ml-5 shrink-0 transition-colors duration-300 ${isFocused ? "text-blue-400" : "text-gray-500"}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={dict.hero?.searchPlaceholder || "¿Qué necesitas hacer con tu nueva laptop?"}
          className="flex-1 bg-transparent px-4 py-5 text-base text-white placeholder-gray-500 font-medium outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="mr-4 p-2 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X size={18} className="text-gray-500 hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-0 left-0 right-0 z-50 bg-black/95 border border-gray-800/80 shadow-2xl overflow-hidden animate-hero-entry">
          <div className="px-5 py-3 border-b border-gray-800/60">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
              {dict.hero?.suggestions || "Sugerencias"}
            </p>
          </div>
          {filtered.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-blue-950/30 transition-colors text-left group border-b border-gray-800/30 last:border-0 cursor-pointer"
            >
              <div className="p-2.5 bg-gray-950 border border-gray-800 group-hover:border-blue-500/40 group-hover:scale-105 transition-all duration-200">
                {CATEGORY_ICON[s.category ?? ""] || <Search size={16} className="text-blue-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{s.query}</p>
                <p className="text-[10px] text-gray-500 font-black uppercase mt-0.5 tracking-wide">{s.result_counts} opciones verificadas</p>
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Ticker — muestra noticias reales si están disponibles
   Cada item: [FUENTE en azul] [Titular en blanco]
───────────────────────────────────────────────────────── */
function NewsTicker({ news }: { news?: HardwareNews[] }) {
  const items: { source: string; headline: string; url?: string }[] =
    news && news.length > 0
      ? news.map((n) => ({ source: n.category, headline: n.title, url: n.sourceUrl }))
      : STATIC_TICKER;

  const doubled = [...items, ...items];

  return (
    <div
      id="noticias"
      className="nvidia-ticker-strip w-full scroll-mt-28"
      style={{ borderTop: "1px solid rgba(59,130,246,0.25)" }}
    >
      <div className="nvidia-ticker-track nvidia-ticker-track-hover">
        {doubled.map((item, i) => {
          const inner = (
            <div
              className="flex flex-col justify-center px-7 py-4 hover:bg-blue-950/20 transition-colors border-r min-w-[230px] max-w-[280px]"
              style={{ borderRightColor: "rgba(255,255,255,0.06)" }}
            >
              {/* Fuente — prominente en azul */}
              <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 text-blue-400">
                {item.source}
              </span>
              {/* Titular — blanco */}
              <p className="text-[11px] text-gray-200 font-semibold leading-snug line-clamp-2 group-hover:text-white transition-colors">
                {item.headline}
              </p>
            </div>
          );

          return item.url ? (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center shrink-0 group cursor-pointer"
            >
              {inner}
            </a>
          ) : (
            <div key={i} className="flex items-center shrink-0 group">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   HeroSection — layout NVIDIA-style, paleta azul/blanco
───────────────────────────────────────────────────────── */
interface HeroSectionProps {
  readonly dict: any;
  readonly news?: HardwareNews[];
}

export default function HeroSection({ dict, news }: HeroSectionProps) {
  return (
    <section className="relative w-full min-h-screen flex flex-col overflow-hidden bg-black">

      {/* ── Imagen de fondo ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Technology Background"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50 pointer-events-none select-none"
        />
        {/* Gradiente cinematográfico left-to-right */}
        <div className="hero-gradient absolute inset-0" />
        {/* Cuadrícula tech azul sutil */}
        <div className="hero-grid-overlay absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* ── Rayo de escaneo azul ── */}
      <div className="scan-beam" aria-hidden="true" />

      {/* ── Contenido principal ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="max-w-3xl">

            {/* Badge de categoría con línea expansiva azul */}
            <div className="mb-8 animate-hero-entry" style={{ animationDelay: "0s" }}>
              <span className="block text-xs sm:text-sm font-black uppercase tracking-[0.22em] mb-2 text-blue-400/70">
                {dict.hero?.aiTag || "Laptops & Tecnología"}
              </span>
              <div
                className="h-[2px] bg-blue-500"
                style={{ animation: "badgeLine 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s both" }}
              />
            </div>

            {/* Título principal — Barlow Condensed 700 (NVIDIA-style) */}
            <h1
              className="mb-6 leading-[0.95] font-bold text-white drop-shadow-2xl"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3rem, 8vw, 6.5rem)",
                letterSpacing: "-0.02em",
                fontWeight: 700,
              }}
            >
              <span
                className="block"
                style={{ animation: "clipReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}
              >
                {dict.hero?.title1 || "Tu Próxima Laptop,"}
              </span>
              <span
                className="block text-blue-500/75"
                style={{ animation: "clipReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}
              >
                {dict.hero?.title2 || "Al Mejor Precio"}
              </span>
              <span
                className="block text-gray-300"
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 3.5rem)",
                  fontWeight: 600,
                  animation: "clipReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s both",
                }}
              >
                {dict.hero?.titleSub || "Con Análisis Experto"}
              </span>
            </h1>

            {/* Subtítulo */}
            <p
              className="text-base sm:text-lg text-gray-300 mb-10 max-w-xl font-medium leading-relaxed animate-hero-entry"
              style={{ animationDelay: "0.55s" }}
            >
              {dict.hero?.subtitle || "Analizamos miles de ofertas para que encuentres la laptop perfecta, seleccionada bajo estrictas directivas de rendimiento real."}
            </p>

            {/* Buscador */}
            <div
              className="w-full max-w-2xl animate-hero-entry mb-8"
              style={{ animationDelay: "0.65s" }}
            >
              <PredictiveSearch dict={dict} />
            </div>

            {/* CTAs */}
            <div
              className="flex flex-wrap items-center gap-4 animate-hero-entry"
              style={{ animationDelay: "0.75s" }}
            >
              <a
                href="#productos"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold uppercase tracking-widest bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 border border-blue-500/30 text-white transition-all duration-200 shadow-lg shadow-blue-500/20"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {dict.hero?.ctaCatalog || "Ver Catálogo"}
                <ChevronRight size={16} />
              </a>
              <a
                href="#ofertas"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-white border border-white/25 hover:border-blue-500 hover:text-blue-400 transition-all duration-300"
              >
                {dict.hero?.ctaDeals || "Mejores Ofertas"}
              </a>
            </div>

          </div>
        </div>
      </div>

      {/* ── Ticker de noticias ── */}
      <div className="relative z-10 w-full">
        <NewsTicker news={news} />
      </div>

      {/* ── Scroll indicator → apunta al ticker de noticias ── */}
      <a
        href="#noticias"
        className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1.5 text-white/40 hover:text-blue-400 transition-colors cursor-pointer select-none"
      >
        <span className="text-[9px] uppercase tracking-[0.2em] font-black">
          {dict.navbar?.news || "Noticias"}
        </span>
        <ChevronDown size={20} className="scroll-indicator" />
      </a>

    </section>
  );
}

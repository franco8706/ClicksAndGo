"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Search, X, Laptop, Monitor, MonitorSmartphone, Keyboard, Mouse,
  Headphones, Webcam, Printer, Droplet, ChevronDown, ChevronRight,
} from "lucide-react";
import type { HardwareNews } from "@/types/laptop";
import { PRODUCT_TYPES, type ProductType } from "@/types/product";
import type { Dict } from "@/types/dictionary";

/* ── Iconos por tipo de producto (multi-producto) ── */
const TYPE_ICON: Record<ProductType, React.ReactNode> = {
  laptop:     <Laptop            size={16} className="text-blue-500" />,
  desktop:    <Monitor           size={16} className="text-blue-500" />,
  monitor:    <MonitorSmartphone size={16} className="text-blue-500" />,
  keyboard:   <Keyboard          size={16} className="text-blue-500" />,
  mouse:      <Mouse             size={16} className="text-blue-500" />,
  headphones: <Headphones        size={16} className="text-blue-500" />,
  webcam:     <Webcam            size={16} className="text-blue-500" />,
  printer:    <Printer           size={16} className="text-blue-500" />,
  supplies:   <Droplet           size={16} className="text-blue-500" />,
};

/** Una sugerencia = un tipo de producto (dispara el filtro del catálogo). */
interface TypeSuggestion {
  readonly category: ProductType;
  readonly query: string;   // etiqueta localizada (ej. "Monitores")
  readonly hint: string;    // tagline por tipo
}

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
function PredictiveSearch({ dict }: { readonly dict: Dict }) {
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

  // Sugerencias = tipos de producto (localizados). Se construyen de la taxonomía.
  const suggestions = useMemo<TypeSuggestion[]>(() => {
    const catDict = (dict.categories ?? {}) as Record<string, string>;
    const tagDict = (dict.typeTagline ?? {}) as Record<string, string>;
    return PRODUCT_TYPES.map((t) => ({ category: t, query: catDict[t] || t, hint: tagDict[t] || "" }));
  }, [dict]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return suggestions; // sin texto: navegar todas las categorías
    return suggestions
      .filter((s) => s.query.toLowerCase().includes(q) || s.category.includes(q) || s.hint.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, suggestions]);

  const isOpen = isFocused && filtered.length > 0;

  const handleSelect = (s: TypeSuggestion) => {
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
        className={`relative flex items-center transition-all duration-200 border-b-2
          ${isFocused ? "border-blue-600 bg-blue-50/50" : "border-[#d3d7dd] bg-transparent"}`}
        style={isFocused ? { boxShadow: "0 6px 20px rgba(37,99,235,0.12)" } : {}}
      >
        <Search
          size={20}
          className={`ml-5 shrink-0 transition-colors duration-200 ${isFocused ? "text-blue-600" : "text-[#9aa1ac]"}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={dict.hero?.searchPlaceholder || "¿Qué necesitas hacer con tu nueva laptop?"}
          className="flex-1 bg-transparent px-4 py-5 text-base text-[#0a0e14] placeholder-[#9aa1ac] font-medium outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="mr-4 p-2 rounded hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X size={18} className="text-[#9aa1ac] hover:text-[#414855]" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-0 left-0 right-0 z-50 bg-white border border-[#e6e8ec] rounded-b shadow-lg overflow-hidden animate-hero-entry">
          <div className="px-5 py-3 border-b border-[#e6e8ec]">
            <p className="text-[10px] uppercase tracking-widest text-[#9aa1ac] font-black">
              {dict.hero?.suggestions || "Sugerencias"}
            </p>
          </div>
          {filtered.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-colors text-left group border-b border-[#e6e8ec] last:border-0 cursor-pointer"
            >
              <div className="p-2.5 rounded bg-[#f5f6f8] border border-[#e6e8ec] group-hover:border-blue-300 group-hover:scale-105 transition-all duration-200">
                {TYPE_ICON[s.category] || <Search size={16} className="text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0a0e14] group-hover:text-blue-600 transition-colors">{s.query}</p>
                {s.hint && <p className="text-[11px] text-[#9aa1ac] font-medium mt-0.5 line-clamp-1">{s.hint}</p>}
              </div>
              <ChevronRight size={14} className="text-[#9aa1ac] group-hover:text-blue-600 transition-colors" />
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
// 🛡️ Solo http(s): las URLs de noticias vienen de feeds RSS externos.
// Evita inyección de esquemas peligrosos (javascript:, data:, vbscript:).
function safeHttpUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function NewsTicker({ news }: { news?: HardwareNews[] }) {
  const items: { source: string; headline: string; url?: string }[] =
    news && news.length > 0
      ? news.map((n) => ({ source: n.category, headline: n.title, url: safeHttpUrl(n.sourceUrl) }))
      : STATIC_TICKER;

  const doubled = [...items, ...items];

  return (
    <div
      id="noticias"
      className="nvidia-ticker-strip w-full scroll-mt-28"
      style={{ borderTop: "1px solid rgba(37,99,235,0.18)" }}
    >
      <div className="nvidia-ticker-track nvidia-ticker-track-hover">
        {doubled.map((item, i) => {
          const inner = (
            <div
              className="flex flex-col justify-center px-7 py-4 hover:bg-blue-50 transition-colors border-r min-w-[230px] max-w-[280px]"
              style={{ borderRightColor: "rgba(10,14,20,0.06)" }}
            >
              {/* Fuente — prominente en azul */}
              <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 text-blue-600">
                {item.source}
              </span>
              {/* Titular */}
              <p className="text-[11px] text-[#414855] font-semibold leading-snug line-clamp-2 group-hover:text-[#0a0e14] transition-colors">
                {item.headline}
              </p>
            </div>
          );

          return item.url ? (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
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
  readonly dict: Dict;
  readonly news?: HardwareNews[];
}

export default function HeroSection({ dict, news }: HeroSectionProps) {
  return (
    <section className="relative w-full min-h-screen flex flex-col overflow-hidden bg-white">

      {/* ── Imagen de fondo (muy sutil, se funde con el blanco a la izquierda) ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Technology Background"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.12] pointer-events-none select-none"
        />
        {/* Gradiente blanco left-to-right (deja respirar la imagen a la derecha) */}
        <div className="hero-gradient absolute inset-0" />
        {/* Cuadrícula tech azul sutil */}
        <div className="hero-grid-overlay absolute inset-0 opacity-70" />
      </div>

      {/* ── Contenido principal ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="max-w-3xl">

            {/* Badge de categoría con línea azul */}
            <div className="mb-8 animate-hero-entry" style={{ animationDelay: "0s" }}>
              <span className="block text-xs sm:text-sm font-black uppercase tracking-[0.22em] mb-2 text-blue-600">
                {dict.hero?.aiTag || "Laptops & Tecnología"}
              </span>
              <div className="h-[2px] w-24 bg-blue-600" />
            </div>

            {/* Título principal — Barlow 700 sentence-case (NVIDIA-style) */}
            <h1
              className="mb-6 leading-[0.98] font-bold text-[#0a0e14]"
              style={{
                fontSize: "clamp(3rem, 8vw, 6.5rem)",
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              <span className="block">
                {dict.hero?.title1 || "Tu Próxima Laptop,"}
              </span>
              <span className="block text-blue-600">
                {dict.hero?.title2 || "Al Mejor Precio"}
              </span>
              <span
                className="block text-[#6b7280]"
                style={{ fontSize: "clamp(1.6rem, 4vw, 3.5rem)", fontWeight: 600 }}
              >
                {dict.hero?.titleSub || "Con Análisis Experto"}
              </span>
            </h1>

            {/* Subtítulo */}
            <p
              className="text-base sm:text-lg text-[#414855] mb-10 max-w-xl font-medium leading-relaxed animate-hero-entry"
              style={{ animationDelay: "0.15s" }}
            >
              {dict.hero?.subtitle || "Analizamos miles de ofertas para que encuentres la laptop perfecta, seleccionada bajo estrictas directivas de rendimiento real."}
            </p>

            {/* Buscador — punto de entrada único al catálogo (los CTAs
                redundantes se quitaron: el buscador + "Explorá por categoría"
                de abajo ya llevan al catálogo y a las ofertas). */}
            <div
              className="w-full max-w-2xl animate-hero-entry"
              style={{ animationDelay: "0.2s" }}
            >
              <PredictiveSearch dict={dict} />
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
        className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1.5 text-[#9aa1ac] hover:text-blue-600 transition-colors cursor-pointer select-none"
      >
        <span className="text-[9px] uppercase tracking-[0.2em] font-black">
          {dict.navbar?.news || "Noticias"}
        </span>
        <ChevronDown size={20} className="scroll-indicator" />
      </a>

    </section>
  );
}

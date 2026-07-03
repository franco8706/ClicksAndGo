"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image"; // 🚀 Optimización nativa de Core Web Vitals (LCP)
import { Search, X, Command, Briefcase, Video, Gamepad2, GraduationCap, Zap, Laptop, ChevronDown } from "lucide-react";
import type { SearchSuggestion } from "@/types/laptop";

/** * 🧩 DICCIONARIO DE ICONOS (Sincronizado con la paleta azul tecnológica v3.6)
 */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  gaming: <Gamepad2 size={16} className="text-blue-400" />,
  business: <Briefcase size={16} className="text-blue-400" />,
  workstation: <Zap size={16} className="text-blue-400" />,
  ultrabook: <Laptop size={16} className="text-blue-400" />,
  budget: <GraduationCap size={16} className="text-blue-400" />,
  creator: <Video size={16} className="text-blue-400" />,
};

// Datos maestros estáticos memoizados fuera del ciclo de renderizado para latencia cero
const SUGGESTIONS: SearchSuggestion[] = [
  { query: "Laptop para jugar juegos pesados", category: "gaming", result_counts: 12 },
  { query: "Laptop ligera para la oficina", category: "business", result_counts: 8 },
  { query: "Potencia máxima para programar", category: "workstation", result_counts: 4 },
  { query: "Laptop económica para estudiar", category: "budget", result_counts: 23 },
  { query: "Notebook para edición de video 4K", category: "creator", result_counts: 7 },
];

/**
 * 🔍 BUSCADOR PREDICTIVO (Adaptado a Entornos Oscuros Premium con Glassmorphism)
 */
function PredictiveSearch({ dict }: { readonly dict: any }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🚀 FIX UX: Activamos el atajo de teclado real (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];
    return SUGGESTIONS.filter((s) => s.query.toLowerCase().includes(cleanQuery)).slice(0, 5);
  }, [query]);

  const isOpen = isFocused && query.length > 0 && filtered.length > 0;

  const handleSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.query);
    setIsFocused(false);
    inputRef.current?.blur();

    // Notifica al CatalogSection qué categoría filtrar
    window.dispatchEvent(
      new CustomEvent("catalog:filter", { detail: { category: suggestion.category } })
    );

    // Navega a la sección de productos con un pequeño delay para que React actualice el filtro
    setTimeout(() => {
      document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ease-out ${isFocused ? "border-blue-500 bg-gray-900/90 shadow-[0_0_30px_rgba(59,130,246,0.25)] ring-4 ring-blue-500/10" : "border-gray-800/80 bg-gray-900/40 shadow-2xl shadow-black/40"}`}>
        <Search size={20} className={`ml-5 shrink-0 transition-colors duration-300 ${isFocused ? "text-blue-400" : "text-gray-400"}`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={dict.hero?.searchPlaceholder || "¿Qué necesitas hacer con tu nueva laptop?"}
          className="flex-1 bg-transparent px-4 py-5 text-base text-white placeholder-gray-500 font-medium outline-none"
        />

        <div className="flex items-center gap-3 mr-4">
          {query && (
            <button onClick={() => setQuery("")} className="p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer" aria-label="Limpiar búsqueda">
              <X size={18} className="text-gray-400 hover:text-gray-300" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 bg-gray-950 border border-gray-800 rounded-lg select-none">
            <Command size={10} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400">K</span>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-3 left-0 right-0 z-50 glass-effect rounded-2xl overflow-hidden shadow-2xl shadow-black border border-gray-800/80 animate-hero-entry">
          <div className="px-5 py-3 border-b border-gray-800/60 bg-gray-950/40">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              {dict.hero?.suggestions || "Sugerencias Inteligentes"}
            </p>
          </div>
          {filtered.map((suggestion, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(suggestion); }}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors text-left group border-b border-gray-800/30 last:border-0 cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 shadow-md group-hover:scale-105 transition-transform duration-200">
                {CATEGORY_ICON[suggestion.category ?? ""] || <Search size={16} className="text-blue-400" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{suggestion.query}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase mt-0.5 tracking-wide">{suggestion.result_counts} opciones verificadas</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HeroSectionProps {
  readonly dict: any;
}

/**
 * 🚀 HERO SECTION DE MARCA (REDISEÑO ESTILO NVIDIA PREMIUM v3.6)
 */
export default function HeroSection({ dict }: HeroSectionProps) {
  return (
    <section className="relative w-full min-h-screen pt-40 pb-28 px-4 flex flex-col items-center justify-center text-center overflow-hidden bg-black">

      {/* 🏙️ Capa de fondo optimizada con Next.js Image Component */}
      <div className="absolute inset-0 dynamics-nav z-0">
        <Image
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Technology Core Background"
          fill
          priority // Fuerza la pre-carga inmediata para pulverizar los tiempos de LCP
          sizes="100vw"
          className="object-cover opacity-45 pointer-events-none select-none"
        />
        {/* Acoplamos el gradiente cinematográfico y el recubrimiento de atenuación */}
        <div className="hero-gradient absolute inset-0" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Contenedor del Título e Inputs */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center w-full">

        {/* Live Badge de Auditoría Financiera */}
        <div className="animate-hero-entry mb-8 inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-emerald-950/30 border border-emerald-900/40 shadow-xl backdrop-blur-sm select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
            {dict.hero?.verifiedDeals || "Precios auditados en tiempo real"}
          </span>
        </div>

        {/* Tag Superior */}
        <div className="mb-3 animate-hero-entry">
          <span className="text-blue-400 font-extrabold text-xs sm:text-sm tracking-widest uppercase select-none">
            {dict.hero?.aiTag || "Inteligencia Artificial Multirregión"}
          </span>
        </div>

        {/* Jerarquía Tipográfica Principal con efecto metálico text-gradient */}
        <h1 className="animate-hero-entry text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05] max-w-5xl tracking-tight drop-shadow-2xl">
          <span className="text-gradient">{dict.hero?.title1 || "Encuentra tu Laptop Ideal"}</span> <br />
          <span className="text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]">{dict.hero?.title2 || "Con Análisis Experto"}</span>
        </h1>

        {/* Subtítulo Tecnológico */}
        <p className="animate-hero-entry text-base sm:text-xl text-gray-300 mb-12 max-w-2xl font-medium leading-relaxed drop-shadow [animation-delay:0.1s]">
          {dict.hero?.subtitle || "Analizamos miles de ofertas para que encuentres la laptop perfecta, seleccionada bajo estrictas directivas de rendimiento real."}
        </p>

        {/* Buscador de Latencia Cero Integrado */}
        <div className="w-full max-w-2xl mx-auto animate-hero-entry [animation-delay:0.15s]">
          <PredictiveSearch dict={dict} />
        </div>

      </div>

      {/* Indicador de desplazamiento vertical amortiguado por hardware */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 scroll-indicator text-white/50 hover:text-white transition-colors cursor-pointer hidden md:block">
        <ChevronDown size={28} />
      </div>
    </section>
  );
}
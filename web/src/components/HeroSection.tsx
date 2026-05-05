"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Cpu, TrendingDown, Star, X, ArrowRight } from "lucide-react";
import type { SearchSuggestion } from "@/types/laptop";

// Seed de sugerencias estáticas
const SUGGESTIONS: SearchSuggestion[] = [
  { query: "Gaming laptop RTX 4070", category: "gaming", result_counts: 12 },
  { query: "ThinkPad business ultrabook", category: "business", result_counts: 8 },
  { query: "MacBook Pro M3", category: "workstation", result_counts: 4 },
  { query: "Mejor laptop para programar", category: "ultrabook", result_counts: 19 },
  { query: "Notebook barata menos de $700", category: "budget", result_counts: 23 },
  { query: "Creator laptop Adobe Premiere", category: "creator", result_counts: 7 },
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  gaming: <Cpu size={13} className="text-purple-400" />,
  business: <Star size={13} className="text-blue-400" />,
  workstation: <Cpu size={13} className="text-amber-400" />,
  ultrabook: <TrendingDown size={13} className="text-emerald-400" />,
  budget: <TrendingDown size={13} className="text-cyan-400" />,
  creator: <Star size={13} className="text-pink-400" />,
};

// --- Predictive Search Bar ---
function PredictiveSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = SUGGESTIONS.filter((s) =>
    s.query.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.query);
    setIsOpen(false);
    inputRef.current?.blur();
  }, []);

  useEffect(() => {
    setIsOpen(query.length > 0 && filtered.length > 0 && isFocused);
  }, [query, filtered.length, isFocused]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Glow ring on focus */}
      {isFocused && (
        <div className="absolute -inset-px rounded-xl bg-cyan-500/20 blur-sm pointer-events-none" />
      )}

      {/* Input wrapper */}
      <div 
        className={`relative flex items-center bg-slate-900 rounded-xl border transition-all duration-200 ${
          isFocused ? "border-cyan-500/50" : "border-slate-700"
        }`}
      >
        <Search size={16} className={`ml-4 shrink-0 transition-colors ${isFocused ? "text-cyan-400" : "text-slate-500"}`} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Busca por modelo, specs o necesidad..."
          className="flex-1 bg-transparent px-3 py-4 text-sm text-white placeholder-slate-500 font-mono outline-none caret-cyan-400"
        />

        {query && (
          <button 
            onClick={() => setQuery("")}
            className="mr-2 p-1.5 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={14} className="text-slate-500" />
          </button>
        )}

        <button className="mr-2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-semibold font-mono hover:bg-cyan-500/20 transition-all duration-200 shrink-0">
          <span>BUSCAR</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
          <div className="px-3 pt-2 pb-1">
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Sugerencias del motor IA</p>
          </div>
          {filtered.map((suggestion, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(suggestion)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left group"
            >
              <span className="shrink-0">
                {CATEGORY_ICON[suggestion.category ?? ""] ?? <Search size={13} className="text-slate-400" />}
              </span>
              <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors font-mono">
                {suggestion.query}
              </span>
              <span className="text-[10px] font-mono text-slate-600">
                {suggestion.result_counts} resultados
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Hero Stats Pill ---
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-6">
      <span className="font-mono text-lg font-bold text-white">{value}</span>
      <span className="font-mono text-xs text-slate-500">{label}</span>
    </div>
  );
}

// --- Main Component: HeroSection ---
export default function HeroSection() {
  return (
    <section className="relative w-full pt-28 pb-16 px-4 flex flex-col items-center text-center overflow-hidden">
      {/* Background grid pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Badge */}
      <div className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
          Motor IA activo – 1.847 escaneos hoy
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight max-w-3xl">
        El mejor precio de laptop,{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
          detectado por IA
        </span>
      </h1>

      <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-xl leading-relaxed">
        Comparamos Amazon, MercadoLibre, Dell, HP y Lenovo en tiempo real.
        Solo mostramos la oferta cuando vale la pena.
      </p>

      {/* Search */}
      <div className="w-full mb-12">
        <PredictiveSearch />
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {["Gaming", "Trabajo", "Ultrabook", "Menos de $800", "Mac", "Workstation"].map((tag) => (
          <button
            key={tag}
            className="font-mono text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-200"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 sm:gap-0 divide-x divide-slate-800">
        <StatPill value="2.400+" label="modelos" />
        <StatPill value="7" label="retailers" />
        <StatPill value="$287" label="ahorro prom." />
        <StatPill value="24/7" label="monitoreo" />
      </div>
    </section>
  );
}

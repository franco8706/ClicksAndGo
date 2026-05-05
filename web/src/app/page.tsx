"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, LayoutGrid, List, Bot, Zap } from "lucide-react";
import type { Laptop, LaptopCategory } from "@/types/laptop";
import { MOCK_LAPTOPS } from "@/lib/mock-data";
import LaptopCard from "@/components/LaptopCard";
import SkeletonCard from "@/components/SkeletonCard";
import HeroSection from "@/components/HeroSection";
import AIDealsSection from "@/components/AIDealsSection";

// --- Navbar Component ---
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Zap size={14} className="text-cyan-400" />
          </div>
          <span className="font-mono text-sm font-bold text-white tracking-tight">
            clicks<span className="text-cyan-400">&</span>go
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-6">
          {["Laptops", "Ofertas IA", "Comparar", "Alertas"].map((item) => (
            <a key={item} href="#" className="font-mono text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-widest">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-500">
            <Bot size={12} className="text-cyan-400" />
            <span>IA activa</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <button className="font-mono text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all duration-200">
            Alertas
          </button>
        </div>
      </div>
    </nav>
  );
}

// --- Constants & Types ---
const CATEGORIES: { value: LaptopCategory | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "gaming", label: "Gaming" },
  { value: "business", label: "Trabajo" },
  { value: "ultrabook", label: "Ultrabook" },
  { value: "creator", label: "Creadores" },
  { value: "workstation", label: "Workstation" },
  { value: "budget", label: "Económico" },
];

interface FilterBarProps {
  active: string;
  onSelect: (val: string) => void;
  viewMode: "grid" | "list";
  onViewMode: (m: "grid" | "list") => void;
}

function FilterBar({ active, onSelect, viewMode, onViewMode }: FilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-y border-slate-800">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        <SlidersHorizontal size={14} className="text-slate-500 shrink-0" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={`font-mono text-xs px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-all duration-200 ${
              active === cat.value
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                : "text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-800 p-1 shrink-0">
        {[
          { mode: "grid", icon: <LayoutGrid size={13} /> },
          { mode: "list", icon: <List size={13} /> },
        ].map(({ mode, icon }) => (
          <button
            key={mode}
            onClick={() => onViewMode(mode as "grid" | "list")}
            className={`p-1.5 rounded transition-all duration-200 ${
              viewMode === mode ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Product Grid ---
interface ProductGridProps {
  laptops: Laptop[];
  isLoading: boolean;
  viewMode: "grid" | "list";
}

function ProductGrid({ laptops, isLoading, viewMode }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className={`grid ${viewMode === "grid" 
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
        : "grid-cols-1 sm:grid-cols-2 gap-4"}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (laptops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Bot size={36} className="text-slate-700 mb-4" />
        <p className="font-mono text-sm text-slate-500">Sin resultados para ese filtro</p>
        <p className="font-mono text-xs text-slate-600 mt-1">El agente IA sigue buscando nuevas ofertas</p>
      </div>
    );
  }

  return (
    <div className={`grid ${viewMode === "grid" 
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
      : "grid-cols-1 sm:grid-cols-2 gap-4"}`}>
      {laptops.map((laptop, i) => (
        <LaptopCard key={laptop.id} laptop={laptop} isNew={i < 2} />
      ))}
    </div>
  );
}

// --- Main Page ---
export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtered, setFiltered] = useState<Laptop[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const results = category === "all" 
        ? MOCK_LAPTOPS 
        : MOCK_LAPTOPS.filter(l => l.category === category);
      setFiltered(results);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [category]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 pb-20">
      <Navbar />
      <HeroSection />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <AIDealsSection />

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-xs text-slate-500">
              {isLoading ? "Cargando laptops..." : `${filtered.length} laptops encontradas`}
              <p className="text-cyan-400/60 mt-1">Actualizado hace 2 min</p>
            </div>
          </div>

          <FilterBar 
            active={category} 
            onSelect={setCategory} 
            viewMode={viewMode} 
            onViewMode={setViewMode} 
          />

          <div className="mt-8">
            <ProductGrid laptops={filtered} isLoading={isLoading} viewMode={viewMode} />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-slate-600">
            clicks&go © 2026 - Motor IA en Rust + Next.js 14
          </p>
          <p className="font-mono text-xs text-slate-700">
            Algunos enlaces son de afiliados. El precio no varía para el comprador.
          </p>
        </div>
      </footer>
    </main>
  );
}

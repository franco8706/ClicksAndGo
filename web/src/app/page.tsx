"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, LayoutGrid, List, Bot, Zap } from "lucide-react";
import type { Laptop, LaptopCategory } from "@/types/laptop";
import LaptopCard from "@/components/LaptopCard";
import SkeletonCard from "@/components/SkeletonCard";
import HeroSection from "@/components/HeroSection";
import AIDealsSection from "@/components/AIDealsSection";

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
            <a key={item} href="#" className="font-mono text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-widest">{item}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-500">
            <Bot size={12} className="text-cyan-400" />
            <span>IA activa</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <button className="font-mono text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all duration-200">Alertas</button>
        </div>
      </div>
    </nav>
  );
}

const CATEGORIES: { value: LaptopCategory | "all"; label: string }[] = [
  { value: "all", label: "Todos" }, { value: "gaming", label: "Gaming" }, { value: "business", label: "Trabajo" },
  { value: "ultrabook", label: "Ultrabook" }, { value: "creator", label: "Creadores" }, { value: "workstation", label: "Workstation" }, { value: "budget", label: "Económico" }
];

function FilterBar({ active, onSelect, viewMode, onViewMode }: any) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-y border-slate-800">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        <SlidersHorizontal size={14} className="text-slate-500 shrink-0" />
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => onSelect(cat.value)} className={`font-mono text-xs px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-all duration-200 ${active === cat.value ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200"}`}>{cat.label}</button>
        ))}
      </div>
    </div>
  );
}

function ProductGrid({ laptops, isLoading, viewMode, tipoCambio }: any) {
  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (laptops.length === 0) return <div className="flex flex-col items-center justify-center py-24 text-center"><Bot size={36} className="text-slate-700 mb-4" /><p className="font-mono text-sm text-slate-500">Sin resultados</p></div>;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {laptops.map((laptop: any, i: number) => (
        <LaptopCard key={laptop.id || i} laptop={laptop} isNew={i < 2} tipoCambio={tipoCambio} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [allLaptops, setAllLaptops] = useState<Laptop[]>([]);
  const [filtered, setFiltered] = useState<Laptop[]>([]);
  const [dolarOficial, setDolarOficial] = useState<number>(1050);

  useEffect(() => {
    const fetchDatosIntegrados = async () => {
      try {
        // Agente Orquestador: Busca el dólar en tiempo real a DolarAPI
        const reqDolar = await fetch('https://dolarapi.com/v1/dolares/oficial');
        if (reqDolar.ok) {
          const dataDolar = await reqDolar.json();
          if (dataDolar.venta) setDolarOficial(dataDolar.venta);
        }

        // Busca los datos de PostgreSQL
        const resLaptops = await fetch('/api/notebooks');
        if (resLaptops.ok) {
          const dataLaptops = await resLaptops.json();
          setAllLaptops(dataLaptops);
          setFiltered(dataLaptops);
        }
      } catch (error) {
        console.error("Fallo crítico:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatosIntegrados();
  }, []);

  useEffect(() => {
    if (category === "all") setFiltered(allLaptops);
    else setFiltered(allLaptops.filter(l => l.category === category));
  }, [category, allLaptops]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 pb-20">
      <Navbar />
      <HeroSection />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <AIDealsSection />
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-xs text-slate-500">
              {isLoading ? "Cargando ofertas..." : `${filtered.length} laptops encontradas`}
              <p className="text-cyan-400/60 mt-1">Cotización Dólar Oficial: ${dolarOficial}</p>
            </div>
          </div>
          <FilterBar active={category} onSelect={setCategory} viewMode={viewMode} onViewMode={setViewMode} />
          <div className="mt-8">
            <ProductGrid laptops={filtered} isLoading={isLoading} viewMode={viewMode} tipoCambio={dolarOficial} />
          </div>
        </div>
      </section>
    </main>
  );
}
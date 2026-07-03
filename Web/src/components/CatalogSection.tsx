"use client";

import React, { useState, useMemo, useEffect } from "react";
import LaptopCard from "./LaptopCard";
import type { Laptop } from "@/types/laptop";

const FILTERS = [
  { key: "all",         labelKey: "allLaptops" },
  { key: "gaming",      labelKey: "gaming"     },
  { key: "business",    labelKey: "business"   },
  { key: "creator",     labelKey: "creator"    },
  { key: "workstation", labelKey: "workstation"},
  { key: "ultrabook",   labelKey: "ultrabook"  },
  { key: "budget",      labelKey: "budget"     },
];

const VALID_KEYS = new Set(FILTERS.map((f) => f.key));

interface CatalogSectionProps {
  readonly laptops: Laptop[];
  readonly countryCode: string;
  readonly dict: any;
  readonly locale: string;
}

export default function CatalogSection({ laptops, countryCode, dict, locale }: CatalogSectionProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  // Lee ?cat= al montar (para links compartidos / navegación directa)
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    if (cat && VALID_KEYS.has(cat)) setActiveFilter(cat);
  }, []);

  // Escucha el evento del HeroSection cuando el usuario elige una sugerencia
  useEffect(() => {
    const handler = (e: Event) => {
      const { category } = (e as CustomEvent<{ category: string }>).detail;
      if (VALID_KEYS.has(category)) {
        setActiveFilter(category);
        setExpandedId(null);
      }
    };
    window.addEventListener("catalog:filter", handler);
    return () => window.removeEventListener("catalog:filter", handler);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return laptops;
    return laptops.filter((l) => {
      const cat = (
        (l.intelligence as any)?.category ||
        l.metadata_extra?.category ||
        ""
      ).toLowerCase();
      return cat === activeFilter;
    });
  }, [laptops, activeFilter]);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setExpandedId(null);
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* ── Filter chips ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FILTERS.map(({ key, labelKey }) => {
          const label    = dict.common?.[labelKey] || key;
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 border cursor-pointer select-none ${
                isActive
                  ? "bg-blue-600/45 backdrop-blur-sm border-blue-500/40 text-white shadow-lg shadow-blue-500/10"
                  : "border-gray-800/80 text-gray-400 bg-gray-900/30 hover:border-blue-500/40 hover:text-blue-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Results count ──────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <p className="text-gray-600 text-[11px] font-black uppercase tracking-widest mb-6">
          {filtered.length} laptops
        </p>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {filtered.map((laptop) => (
            <LaptopCard
              key={laptop.id}
              laptop={laptop}
              dict={dict}
              locale={locale}
              isExpanded={expandedId === String(laptop.id)}
              onToggle={() => handleToggle(String(laptop.id))}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-gray-900/10 rounded-[2rem] border border-dashed border-gray-800">
          <h3 className="text-lg font-bold text-gray-200 mb-2">
            {dict.common?.noResults || "Sin Resultados"}
          </h3>
          <p className="text-gray-500 text-sm">
            {dict.common?.scanning || "Buscando"} {countryCode}…
          </p>
        </div>
      )}
    </>
  );
}

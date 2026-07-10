"use client";

import React, { useState, useMemo, useEffect } from "react";
import LaptopCard from "./LaptopCard";
import type { Laptop } from "@/types/laptop";
import { PRODUCT_TYPES } from "@/types/product";
import type { Dict } from "@/types/dictionary";

const ALL = "all";
const VALID_TYPES = new Set<string>(PRODUCT_TYPES);
const typeOf = (p: Laptop): string => p.product_type || "laptop";

interface CatalogSectionProps {
  readonly laptops: Laptop[];
  readonly countryCode: string;
  readonly dict: Dict;
  readonly locale: string;
  /** IDs de productos guardados por el usuario logueado */
  readonly favoriteIds?: readonly string[];
  /** Server action de toggle de favorito (pasa hacia LaptopCard) */
  readonly toggleFavoriteAction?: (laptopId: string) => Promise<void>;
}

export default function CatalogSection({
  laptops, countryCode, dict, locale, favoriteIds, toggleFavoriteAction,
}: CatalogSectionProps) {
  const favoriteSet = useMemo(() => new Set(favoriteIds ?? []), [favoriteIds]);
  const [activeFilter, setActiveFilter] = useState<string>(ALL);
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  // 📦 Multi-producto: los chips se derivan de los tipos presentes en el
  // catálogo (ordenados por la taxonomía canónica). Así se auto-adaptan a
  // medida que los retailers suman impresoras, teclados, mouse, etc.
  const availableTypes = useMemo<string[]>(() => {
    const present = new Set(laptops.map(typeOf));
    return PRODUCT_TYPES.filter((t) => present.has(t));
  }, [laptops]);
  const filters = useMemo(() => [ALL, ...availableTypes], [availableTypes]);

  const catDict = (dict.categories ?? {}) as Record<string, string>;
  const labelFor = (key: string) =>
    key === ALL ? (dict.common?.allProducts || dict.common?.allLaptops || "Todos") : (catDict[key] || key);

  // Lee ?cat= al montar (para links compartidos). Solo aplica si es un tipo válido.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización única con la URL, hydration-safe
    if (cat && VALID_TYPES.has(cat)) setActiveFilter(cat);
  }, []);

  // Escucha el evento del HeroSection (buscador) — filtra por tipo de producto.
  useEffect(() => {
    const handler = (e: Event) => {
      const { category } = (e as CustomEvent<{ category: string }>).detail;
      if (VALID_TYPES.has(category)) {
        setActiveFilter(category);
        setExpandedId(null);
      }
    };
    window.addEventListener("catalog:filter", handler);
    return () => window.removeEventListener("catalog:filter", handler);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === ALL) return laptops;
    return laptops.filter((l) => typeOf(l) === activeFilter);
  }, [laptops, activeFilter]);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setExpandedId(null);
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const countNoun = (n: number) =>
    `${n} ${n === 1 ? (dict.common?.productSingular || "producto") : (dict.common?.products || "productos")}`;

  return (
    <>
      {/* ── Filtros por categoría de producto ──────────────────────────── */}
      {filters.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((key) => {
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`px-5 py-2.5 rounded-[2px] text-sm font-bold transition-all duration-200 border cursor-pointer select-none ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-[#e6e8ec] text-[#6b7280] bg-white hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {labelFor(key)}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Results count ──────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <p className="text-[#9aa1ac] text-[11px] font-black uppercase tracking-widest mb-6">
          {countNoun(filtered.length)}
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
              isFavorite={favoriteSet.has(String(laptop.id))}
              toggleFavoriteAction={toggleFavoriteAction}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-[#f5f6f8] rounded-md border border-dashed border-[#d3d7dd]">
          <h3 className="text-lg font-bold text-[#0a0e14] mb-2">
            {dict.common?.noResults || "Sin Resultados"}
          </h3>
          <p className="text-[#6b7280] text-sm">
            {dict.common?.scanning || "Buscando"} {countryCode}…
          </p>
        </div>
      )}
    </>
  );
}

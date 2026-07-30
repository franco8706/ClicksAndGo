"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import LaptopCard from "./LaptopCard";
import CountUp from "./CountUp";
import type { Laptop } from "@/types/laptop";
import { PRODUCT_TYPES, PRODUCT_FAMILY, type ProductType } from "@/types/product";
import type { Dict } from "@/types/dictionary";

const ALL = "all";
const VALID_TYPES = new Set<string>(PRODUCT_TYPES);
// Familias filtrables (banners promocionales): agrupan varios tipos.
const VALID_FAMILIES = new Set<string>(["computing", "peripherals", "printing"]);
const typeOf = (p: Laptop): string => p.product_type || "laptop";
const familyOf = (p: Laptop): string | undefined =>
  PRODUCT_FAMILY[typeOf(p) as ProductType];

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

  // Etiqueta del filtro activo (tipo o familia) para el pill "quitar filtro".
  // Los chips de categoría se movieron a "Explorá por categoría" (patrón ML):
  // acá solo se muestra qué filtro está aplicado, con opción de limpiarlo.
  const activeLabel = (): string | null => {
    if (activeFilter === ALL) return null;
    if (VALID_FAMILIES.has(activeFilter)) {
      const famDict = (dict.families ?? {}) as Record<string, string>;
      return famDict[activeFilter] || activeFilter;
    }
    const catDict = (dict.categories ?? {}) as Record<string, string>;
    return catDict[activeFilter] || activeFilter;
  };

  // Lee ?cat= al montar (para links compartidos). Solo aplica si es un tipo válido.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("cat");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización única con la URL, hydration-safe
    if (cat && VALID_TYPES.has(cat)) setActiveFilter(cat);
  }, []);

  // Escucha el evento de hero/buscador/banners — filtra por tipo o familia.
  useEffect(() => {
    const handler = (e: Event) => {
      const { category } = (e as CustomEvent<{ category: string }>).detail;
      if (VALID_TYPES.has(category) || VALID_FAMILIES.has(category)) {
        setActiveFilter(category);
        setExpandedId(null);
      }
    };
    window.addEventListener("catalog:filter", handler);
    return () => window.removeEventListener("catalog:filter", handler);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === ALL) return laptops;
    if (VALID_FAMILIES.has(activeFilter)) {
      return laptops.filter((l) => familyOf(l) === activeFilter);
    }
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
    n === 1 ? (dict.common?.productSingular || "producto") : (dict.common?.products || "productos");

  return (
    <>
      {/* ── Conteo + filtro activo (removible, estilo MercadoLibre) ─────── */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <p className="text-[#9aa1ac] text-[11px] font-black uppercase tracking-widest">
            {/* `key` por filtro: el contador vuelve a contar en cada cambio de
                categoría, así el número acompaña al re-render del grid en vez
                de saltar de golpe. */}
            <CountUp key={activeFilter} value={filtered.length} />{" "}
            {countNoun(filtered.length)}
          </p>
          {activeFilter !== ALL && (
            <button
              onClick={() => handleFilterChange(ALL)}
              aria-label={dict.common?.clearFilter || "Quitar filtro"}
              className="inline-flex items-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-[2px] px-3 py-1.5 hover:bg-blue-100 transition-colors cursor-pointer select-none pressable pop-in"
            >
              {activeLabel()}
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        /* key={activeFilter} → la cascada de entrada se repite al filtrar
           (patrón ML: el grid "responde" a cada cambio de categoría) */
        <div
          key={activeFilter}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start stagger-children"
        >
          {/* Sin wrapper: el conflicto entre la animación de entrada y el
              hover de la card se resolvió en el CSS —`fadeInUp` anima la
              propiedad independiente `translate`, no `transform`— así que
              vale para los 6 componentes que usan `stagger-children`, no
              solo para este grid. Ver la nota en globals.css. */}
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

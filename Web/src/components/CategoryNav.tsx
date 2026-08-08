"use client";

/**
 * 📂 Navegación de dos niveles del catálogo (taxonomía v8).
 *
 * Con 70 productos alcanzaba una fila de chips. Con el catálogo completo de un
 * retailer —decenas de miles de items en 9 categorías y 56 subcategorías— hace
 * falta jerarquía: se elige la categoría y recién ahí aparecen sus
 * subcategorías.
 *
 * Los conteos vienen de Rails (`/api/v1/products/categories`), que ya descarta
 * las ramas vacías: un menú que ofrece "Servidores" y lleva a una página sin
 * resultados es peor que no ofrecerlo.
 */

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Dict } from "@/types/dictionary";

export interface SubcategoryNode {
  readonly code: string;
  readonly label: string;
  readonly total: number;
}

export interface CategoryNode {
  readonly code: string;
  readonly label: string;
  readonly total: number;
  readonly subcategories: readonly SubcategoryNode[];
}

interface CategoryNavProps {
  readonly tree: readonly CategoryNode[];
  /** Subcategoría activa (`product_type`), o null para "todo". */
  readonly activeType: string | null;
  /** Base de la ruta del catálogo, ej. "/es". */
  readonly basePath: string;
  readonly dict: Dict;
}

export default function CategoryNav({ tree, activeType, basePath, dict }: CategoryNavProps) {
  // Se abre la categoría que contiene la subcategoría activa, así al recargar
  // con ?type=ssd el menú aparece en el lugar donde está parado el usuario.
  const familiaDelActivo =
    tree.find((c) => c.subcategories.some((s) => s.code === activeType))?.code ?? null;
  const [abierta, setAbierta] = useState<string | null>(familiaDelActivo);

  if (tree.length === 0) return null;

  const totalGeneral = tree.reduce((acc, c) => acc + c.total, 0);

  return (
    <nav aria-label={dict.common?.categories || "Categorías"} className="mb-8">
      {/* ── Nivel 1 ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Link
          href={`${basePath}#catalogo`}
          aria-current={activeType === null ? "page" : undefined}
          className={`text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-[2px] border transition-colors cursor-pointer pressable ${
            activeType === null
              ? "bg-[#0a0e14] text-white border-[#0a0e14]"
              : "bg-white text-[#414855] border-[#e6e8ec] hover:border-[#0a0e14]"
          }`}
        >
          {dict.common?.all || "Todo"}{" "}
          <span className="opacity-60 font-bold">{totalGeneral}</span>
        </Link>

        {tree.map((cat) => {
          const contieneActivo = cat.subcategories.some((s) => s.code === activeType);
          const estaAbierta = abierta === cat.code;
          return (
            <button
              key={cat.code}
              onClick={() => setAbierta(estaAbierta ? null : cat.code)}
              aria-expanded={estaAbierta}
              className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-[2px] border transition-colors cursor-pointer pressable ${
                contieneActivo || estaAbierta
                  ? "bg-blue-50 text-blue-700 border-blue-300"
                  : "bg-white text-[#414855] border-[#e6e8ec] hover:border-[#0a0e14]"
              }`}
            >
              {cat.label}
              <span className="opacity-60 font-bold">{cat.total}</span>
              <ChevronDown
                size={12}
                className="transition-transform"
                style={{ rotate: estaAbierta ? "180deg" : "0deg" }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Nivel 2 — solo la categoría abierta ─────────────────────── */}
      {abierta && (
        <div className="flex flex-wrap gap-2 pl-1 pt-1 border-l-2 border-blue-200 ml-1 pop-in">
          {tree
            .find((c) => c.code === abierta)
            ?.subcategories.map((sub) => (
              <Link
                key={sub.code}
                // Navegación por URL y no por estado del cliente: con miles de
                // productos el filtrado en memoria no alcanza (el servidor solo
                // manda una página), y además un <Link> es rastreable — cada
                // subcategoría pasa a ser una URL que Google puede indexar.
                href={
                  sub.code === activeType
                    ? `${basePath}#catalogo`
                    : `${basePath}?type=${encodeURIComponent(sub.code)}#catalogo`
                }
                aria-current={sub.code === activeType ? "page" : undefined}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-[2px] border transition-colors cursor-pointer pressable ${
                  sub.code === activeType
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-[#6b7280] border-[#e6e8ec] hover:border-blue-400 hover:text-blue-700"
                }`}
              >
                {sub.label}{" "}
                <span className="opacity-60">{sub.total}</span>
              </Link>
            ))}
        </div>
      )}
    </nav>
  );
}

"use client";

/**
 * 📄 Paginación del catálogo.
 *
 * Hasta la v8 el catálogo servía como mucho 100 productos por país, o sea que
 * con el catálogo completo de un retailer el 99,98% de los productos no tenía
 * ninguna URL que los mostrara. Esto es la contraparte de la paginación real
 * que se agregó en Rails.
 *
 * ⚠️ El tope de 1.000 páginas NO es arbitrario ni cosmético: `OFFSET` en
 * Postgres cuesta O(offset). Medido con 500.000 productos, la página 1 tarda
 * 0,5 ms y la 1.000 tarda 59 ms. Rails clampea igual (`MAX_PAGE`), así que
 * este límite es un espejo del backend, no la única defensa.
 */

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Dict } from "@/types/dictionary";

/** Espejo de `MAX_PAGE` en notebooks_controller.rb. */
export const MAX_PAGE = 1000;

interface PaginationProps {
  readonly page: number;
  /** Si la página vino llena, asumimos que hay otra. El backend no
   *  devuelve el total a propósito: `COUNT(*)` sobre medio millón de filas
   *  cuesta más que la propia página de resultados. */
  readonly hasNext: boolean;
  /** Base de la ruta del catálogo, ej. "/es". */
  readonly basePath: string;
  /** Subcategoría activa, para conservarla al cambiar de página. */
  readonly activeType?: string | null;
  readonly dict: Dict;
}

export default function Pagination({ page, hasNext, basePath, activeType, dict }: PaginationProps) {
  // ⚠️ El href se construye ACÁ y no se recibe como función.
  //
  // Pasar `(n) => string` desde el Server Component tiraba el home entero con
  // 500: "Functions cannot be passed directly to Client Components". React no
  // puede serializar una función a través de esa frontera. Se pasan los datos
  // (base y filtro) y el cliente arma la URL — mismo patrón que CategoryNav.
  const hrefForPage = (n: number) => {
    const qs = new URLSearchParams();
    if (activeType) qs.set("type", activeType);
    if (n > 1) qs.set("page", String(n));
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ""}#catalogo`;
  };
  const hayPrevia = page > 1;
  const haySiguiente = hasNext && page < MAX_PAGE;

  if (!hayPrevia && !haySiguiente) return null;

  const btn =
    "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest " +
    "px-4 py-2.5 rounded-[2px] border transition-colors cursor-pointer pressable " +
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#e6e8ec]";

  return (
    <nav
      aria-label={dict.common?.pagination || "Paginación"}
      className="flex items-center justify-center gap-4 mt-12"
    >
      {hayPrevia ? (
        <Link href={hrefForPage(page - 1)} rel="prev"
              className={`${btn} bg-white text-[#414855] border-[#e6e8ec] hover:border-[#0a0e14]`}>
          <ChevronLeft size={14} />
          {dict.common?.previous || "Anterior"}
        </Link>
      ) : (
        <span aria-disabled="true" className={`${btn} bg-white text-[#414855] border-[#e6e8ec] opacity-40`}>
          <ChevronLeft size={14} />
          {dict.common?.previous || "Anterior"}
        </span>
      )}

      <span
        className="text-[11px] font-black uppercase tracking-widest text-[#9aa1ac]"
        aria-current="page"
      >
        {dict.common?.page || "Página"} {page}
      </span>

      {haySiguiente ? (
        <Link href={hrefForPage(page + 1)} rel="next"
              className={`${btn} bg-white text-[#414855] border-[#e6e8ec] hover:border-[#0a0e14]`}>
          {dict.common?.next || "Siguiente"}
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span aria-disabled="true" className={`${btn} bg-white text-[#414855] border-[#e6e8ec] opacity-40`}>
          {dict.common?.next || "Siguiente"}
          <ChevronRight size={14} />
        </span>
      )}
    </nav>
  );
}

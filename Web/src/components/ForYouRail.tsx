"use client";

/**
 * "Elegidos para vos" — rail personalizado por actividad del visitante.
 * Selección 100% presentacional (ver Web/src/lib/affinity.ts): re-ordena
 * el catálogo que Rails YA sirvió según señales locales del navegador.
 * Cumplimiento de la Constitución:
 *  - Sin matemática de negocio (precios/scores llegan calculados).
 *  - Sin IA en el frontend (la IA — Vertex/Gemini/Antigravity — corre en
 *    Python y sus resultados llegan por el DTO de Rails).
 *  - Sin datos al servidor: la actividad nunca sale de localStorage.
 * Renderiza solo si hay historial (visitante nuevo no ve nada).
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import ProductImage from "@/components/ProductImage";
import CarouselArrows from "./CarouselArrows";
import { useDragScroll } from "@/lib/useDragScroll";
import type { Laptop } from "@/types/laptop";
import type { Dict } from "@/types/dictionary";
import { rankByAffinity } from "@/lib/affinity";
import { formatCurrencyString } from "@/lib/currency";

interface ForYouRailProps {
  readonly laptops: Laptop[];
  readonly dict: Dict;
}

export default function ForYouRail({ laptops, dict }: ForYouRailProps) {
  // Se calcula solo en el cliente (localStorage no existe en SSR):
  // el server siempre renderiza null y el cliente lo puebla al hidratar.
  const [picks, setPicks] = useState<Laptop[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);
  // Antes del `return null` de abajo: los hooks no pueden quedar detrás de una
  // salida temprana o cambia su orden entre renders.
  const { dragProps } = useDragScroll(stripRef);

  const refresh = useCallback(() => {
    setPicks(rankByAffinity(laptops, 8));
  }, [laptops]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización única con localStorage (client-only), hydration-safe: SSR y primer render coinciden en []
    refresh();
    window.addEventListener("affinity:updated", refresh);
    // Si el visitante retira el consentimiento, el rail desaparece al instante.
    window.addEventListener("consent:changed", refresh);
    return () => {
      window.removeEventListener("affinity:updated", refresh);
      window.removeEventListener("consent:changed", refresh);
    };
  }, [refresh]);

  if (picks.length < 2) return null; // sin historial suficiente, no hay rail

  const scrollBy = (dir: 1 | -1) =>
    stripRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    // Sin encabezado ("Según tu actividad / Elegidos para vos"): los productos
    // hablan solos y el título solo empujaba la tira fuera de la vista. Las
    // flechas quedan flotando a la altura de las imágenes.
    <div className="animate-hero-entry relative">
      <CarouselArrows onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />

      {/* Tira horizontal de mini-cards, arrastrable con el mouse. */}
      <div
        ref={stripRef}
        {...dragProps}
        className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 drag-strip"
      >
        {picks.map((p) => {
          const price = p.financials?.current_price || 0;
          return (
            <a
              key={p.id}
              href={`#productos`}
              onClick={(e) => {
                // Lleva al catálogo filtrado al tipo del producto elegido
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent("catalog:filter", {
                    detail: { category: p.product_type || "laptop" },
                  })
                );
                setTimeout(() => {
                  document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
                }, 60);
              }}
              className="snap-start shrink-0 w-[210px] bg-white border border-[#e6e8ec] hover:border-blue-300 rounded-md lift-card overflow-hidden group cursor-pointer select-none"
            >
              <div className="relative h-[120px] bg-gradient-to-b from-[#f5f6f8] to-[#eef0f3] border-b border-[#e6e8ec]">
                <ProductImage
                  src={p.urls?.image}
                  alt={p.name}
                  productType={p.product_type}
                  sizes="210px"
                  imageClassName="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                  iconSize={34}
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-[#0a0e14] line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                  {p.name}
                </p>
                {/* Precio sin claim de descuento (ver nota en LaptopCard) */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-[#0a0e14] leading-none">
                    {formatCurrencyString(price, p.currency)}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

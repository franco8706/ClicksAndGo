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
import Image from "next/image";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { Laptop } from "@/types/laptop";
import type { Dict } from "@/types/dictionary";
import { rankByAffinity } from "@/lib/affinity";
import { formatCurrencyString } from "@/lib/currency";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80&auto=format&fit=crop";

interface ForYouRailProps {
  readonly laptops: Laptop[];
  readonly dict: Dict;
}

export default function ForYouRail({ laptops, dict }: ForYouRailProps) {
  // Se calcula solo en el cliente (localStorage no existe en SSR):
  // el server siempre renderiza null y el cliente lo puebla al hidratar.
  const [picks, setPicks] = useState<Laptop[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);

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
    <div className="animate-hero-entry">
      {/* Header: eyebrow + título + flechas (layout NVIDIA) */}
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-2">
            <Sparkles size={12} />
            {dict.forYou?.eyebrow || "Según tu actividad"}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0a0e14] tracking-tight">
            {dict.forYou?.title || "Elegidos para vos"}
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button onClick={() => scrollBy(-1)} className="carousel-arrow" aria-label="Anteriores">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scrollBy(1)} className="carousel-arrow" aria-label="Siguientes">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Tira horizontal de mini-cards (patrón carrusel de ML) */}
      <div
        ref={stripRef}
        className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2"
      >
        {picks.map((p) => {
          const price = p.financials?.current_price || 0;
          const img = (p.urls?.image || FALLBACK_IMAGE).replace(/^http:\/\//, "https://");
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
              className="snap-start shrink-0 w-[210px] bg-white border border-[#e6e8ec] hover:border-blue-300 rounded-md card-bloom overflow-hidden group cursor-pointer select-none"
            >
              <div className="relative h-[120px] bg-gradient-to-b from-[#f5f6f8] to-[#eef0f3] border-b border-[#e6e8ec]">
                <Image
                  src={img}
                  alt={p.name}
                  fill
                  sizes="210px"
                  className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
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

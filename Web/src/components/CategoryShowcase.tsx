"use client";

/**
 * Escaparate de categorías — patrón MercadoLibre: fila de tarjetas de
 * acceso rápido bajo el hero (una por categoría del catálogo digital),
 * con scroll horizontal + flechas cuadradas (firma NVIDIA). Cada card
 * filtra el catálogo (evento `catalog:filter`, mismo contrato que el
 * buscador del hero). Presentacional puro: cuenta lo que ya vino de
 * Rails, no pide nada nuevo.
 */

import React, { useMemo, useRef } from "react";
import {
  Laptop, Monitor, MonitorSmartphone, Keyboard, Mouse,
  Headphones, Webcam, Printer, Droplet,
  Package,
} from "lucide-react";
import type { Laptop as Product } from "@/types/laptop";
import { PRODUCT_TYPES, type ProductType } from "@/types/product";
import { recordSignal } from "@/lib/affinity";
import type { Dict } from "@/types/dictionary";
import CarouselArrows from "./CarouselArrows";
import { useDragScroll } from "@/lib/useDragScroll";

const TYPE_ICON: Partial<Record<ProductType, React.ComponentType<{ size?: number; className?: string }>>> = {
  laptop: Laptop,
  desktop: Monitor,
  monitor: MonitorSmartphone,
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  webcam: Webcam,
  printer: Printer,
  supplies: Droplet,
};

interface CategoryShowcaseProps {
  readonly laptops: Product[];
  readonly dict: Dict;
}

export default function CategoryShowcase({ laptops, dict }: CategoryShowcaseProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Tipos presentes en el catálogo actual + conteo (orden canónico).
  const entries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of laptops) {
      const t = l.product_type || "laptop";
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return PRODUCT_TYPES.filter((t) => counts.has(t)).map((t) => ({
      type: t,
      count: counts.get(t) || 0,
    }));
  }, [laptops]);

  const catDict = (dict.categories ?? {}) as Record<string, string>;
  const noun = (n: number) =>
    n === 1
      ? dict.common?.productSingular || "producto"
      : dict.common?.products || "productos";

  const { dragProps } = useDragScroll(stripRef);

  const scrollBy = (dir: 1 | -1) => {
    stripRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const select = (type: ProductType) => {
    recordSignal("filter", { product_type: type }); // señal de interés local
    window.dispatchEvent(new CustomEvent("catalog:filter", { detail: { category: type } }));
    setTimeout(() => {
      document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  if (entries.length === 0) return null;

  return (
    // El encabezado ("Catálogo digital / Explorá por categoría") se quitó: las
    // tarjetas ya dicen qué son y el título solo empujaba el contenido hacia
    // abajo. Las flechas pasaron a flotar sobre la tira, a la altura de las
    // imágenes, en vez de vivir en una fila de título que ya no existe.
    <div className="relative">
      <CarouselArrows onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />

      {/* Tira horizontal de cards (scroll-snap, cascada de entrada).
          Arrastrable con el mouse: el cursor de mano sobre las tarjetas ahora
          también sirve para desplazar. */}
      <div
        ref={stripRef}
        {...dragProps}
        className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 stagger-children drag-strip"
      >
        {entries.map(({ type, count }) => {
          // Respaldo obligatorio: `TYPE_ICON` es Partial desde que la
          // taxonomía pasó de 9 a 56 tipos, y no todos declaran ícono propio.
          const Icon = TYPE_ICON[type] ?? Package;
          return (
            <button
              key={type}
              onClick={() => select(type)}
              className="snap-start shrink-0 w-[148px] sm:w-[164px] bg-white border border-[#e6e8ec] hover:border-blue-300 rounded-md lift-card p-5 flex flex-col items-center gap-3 group cursor-pointer select-none text-center"
            >
              <div className="w-14 h-14 rounded bg-[#eff5ff] border border-[#cddffb] flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
                <Icon size={26} className="text-blue-600" />
              </div>
              <span className="text-sm font-bold text-[#0a0e14] group-hover:text-blue-600 transition-colors leading-tight">
                {catDict[type] || type}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9aa1ac]">
                {count} {noun(count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

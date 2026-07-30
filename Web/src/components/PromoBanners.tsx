"use client";

/**
 * Banners promocionales por familia — patrón MercadoLibre ("HASTA 50%
 * OFF EN SEGURIDAD"): eyebrow + título bold + CTA + área visual de
 * color. El "Hasta X% OFF" sale del máximo `discount_pct` que YA
 * calculó Rails para los productos de esa familia (agregación de
 * display, cero matemática de negocio). Click → filtra el catálogo
 * por familia (evento `catalog:filter`).
 */

import React, { useMemo } from "react";
import { Laptop, Monitor, Headphones, Keyboard, Mouse } from "lucide-react";
import type { Laptop as Product } from "@/types/laptop";
import { PRODUCT_FAMILY, type ProductFamily, type ProductType } from "@/types/product";
import type { Dict } from "@/types/dictionary";

interface PromoBannersProps {
  readonly laptops: Product[];
  readonly dict: Dict;
}

const familyOf = (p: Product): ProductFamily | undefined =>
  PRODUCT_FAMILY[(p.product_type || "laptop") as ProductType];

function maxDiscountOf(laptops: Product[], family: ProductFamily): number {
  let max = 0;
  for (const l of laptops) {
    if (familyOf(l) === family) {
      const pct = l.financials?.discount_pct || 0;
      if (pct > max) max = pct;
    }
  }
  return Math.round(max);
}

export default function PromoBanners({ laptops, dict }: PromoBannersProps) {
  const banners = useMemo(() => {
    const famDict = (dict.families ?? {}) as Record<string, string>;
    return [
      {
        family: "computing" as ProductFamily,
        eyebrow: famDict.computing || "Computación",
        title: dict.promos?.computingTitle || "Potencia para trabajar y jugar",
        maxPct: maxDiscountOf(laptops, "computing"),
        icons: [Laptop, Monitor],
        visualBg: "from-[#eff5ff] to-[#dbe7fd]",
      },
      {
        family: "peripherals" as ProductFamily,
        eyebrow: famDict.peripherals || "Periféricos",
        title: dict.promos?.peripheralsTitle || "Completá tu setup ideal",
        maxPct: maxDiscountOf(laptops, "peripherals"),
        icons: [Headphones, Keyboard, Mouse],
        visualBg: "from-[#f5f6f8] to-[#e8ebf0]",
      },
    ];
  }, [laptops, dict]);

  // Sin productos de esas familias no hay nada que prometer.
  const visible = banners.filter((b) =>
    laptops.some((l) => familyOf(l) === b.family)
  );
  if (visible.length === 0) return null;

  const go = (family: ProductFamily) => {
    window.dispatchEvent(new CustomEvent("catalog:filter", { detail: { category: family } }));
    setTimeout(() => {
      document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  return (
    <div className={`grid grid-cols-1 ${visible.length > 1 ? "md:grid-cols-2" : ""} gap-5`}>
      {visible.map((b) => (
        <button
          key={b.family}
          onClick={() => go(b.family)}
          className="group flex items-stretch bg-white border border-[#e6e8ec] hover:border-blue-300 rounded-md lift-card sheen overflow-hidden text-left cursor-pointer select-none"
        >
          {/* Contenido */}
          <div className="flex-1 p-7 sm:p-8 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7280] mb-2">
              {b.eyebrow}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0a0e14] tracking-tight leading-tight">
              {b.title}
            </h3>
            {/* ⚖️ Sin claim "Hasta X% OFF": el descuento del pipeline se
                calcula contra el MSRP del retailer, no contra el mínimo de
                30 días que exige la Directiva Omnibus UE. Ver LaptopCard. */}
            <span className="btn-nvidia inline-flex items-center w-fit gap-2 px-5 py-2.5 text-xs mt-5">
              {dict.promos?.viewOffers || "Ver ofertas"}
            </span>
          </div>

          {/* Área visual: composición de íconos sobre tinte de marca */}
          <div className={`relative w-[36%] min-h-[176px] bg-gradient-to-br ${b.visualBg} flex items-center justify-center overflow-hidden`}>
            {b.icons.map((Icon, i) => (
              <Icon
                key={i}
                size={i === 0 ? 64 : 44}
                className={`text-blue-600 shrink-0 transition-transform duration-300 ${
                  i === 0
                    ? "opacity-90 group-hover:scale-110 group-hover:-rotate-3"
                    : i === 1
                    ? "-ml-3 mt-10 opacity-40 group-hover:translate-y-[-4px]"
                    : "-ml-2 -mt-10 opacity-30 group-hover:translate-y-[4px]"
                }`}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

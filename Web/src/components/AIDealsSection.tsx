"use client";

/**
 * Mejores Ofertas — escaparate con el patrón hero-carousel de NVIDIA:
 * escenario grande + tab-bar inferior donde la pestaña activa tiene una
 * barra de progreso animada (7s linear, medido en nvidia.com) y el slide
 * rota solo. El anclaje de precio (tachado + % OFF verde) es el patrón
 * de conversión de MercadoLibre. 100% presentacional: los datos llegan
 * ya calculados de Rails (deal_score, discount_pct, original_price) —
 * acá solo se ordena para mostrar y se formatea.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import ProductImage from "@/components/ProductImage";
import { ShoppingCart, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Laptop } from "@/types/laptop";
import { formatCurrencyString } from "@/lib/currency";
import type { Dict } from "@/types/dictionary";

const SLIDE_MS = 7000; // firma NVIDIA: 7s por slide, avance linear

interface AIDealsSectionProps {
  readonly laptops: Laptop[];
  readonly countryCode?: string;
  readonly dict: Dict;
}

/* ── Escenario del deal activo ──────────────────────────────────────── */
function DealStage({
  laptop, countryCode, dict,
}: { readonly laptop: Laptop; readonly countryCode: string; readonly dict: Dict }) {
  /* ⚖️ Sin claim de descuento (% OFF / tachado / "Ahorras"): el
     `original_price` del pipeline es MSRP del retailer, no el mínimo de
     30 días que exige la Directiva Omnibus UE, y Amazon requiere precio
     de PAAPI <24h con timestamp. Ver nota extensa en LaptopCard.tsx. */
  const currentPrice  = laptop.financials?.current_price || 0;
  const isGranOportunidad = (laptop.intelligence?.deal_score ?? 0) >= 8.5;

  const retailerName = laptop.metadata_extra?.retailer
    ?.replace(/_(ar|es|us|mx|br|co|cl)$/i, "")
    .replace(/_/g, " ")
    .toUpperCase() || "TIENDA OFICIAL";

  const rawUrl       = laptop.urls?.affiliate_raw;
  const hasValidUrl  = !!rawUrl && rawUrl !== "#" && rawUrl.startsWith("http");
  const monetizedUrl = hasValidUrl
    ? `/out?url=${encodeURIComponent(rawUrl)}&country=${countryCode}`
    : undefined;

  return (
    <div
      key={laptop.id}
      className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12"
      style={{ animation: "slideFade 0.4s ease-out" }}
    >
      {/* Columna de texto */}
      <div className="order-2 md:order-1">
        {/* Eyebrow "RETAILER | BADGE" (patrón de card NVIDIA) */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black text-[#6b7280] uppercase tracking-widest">
            {retailerName}
          </span>
          {isGranOportunidad && (
            <>
              <span className="text-[#d3d7dd]">|</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <Sparkles size={10} className="fill-current" />
                {dict.deals?.hot || "OFERTA TOP"}
              </span>
            </>
          )}
        </div>

        <h3 className="text-2xl sm:text-3xl font-bold text-[#0a0e14] tracking-tight leading-tight mb-4">
          {laptop.name}
        </h3>

        {/* Precio (sin claim de descuento — ver nota legal arriba) */}
        <span className="text-[10px] font-bold text-[#9aa1ac] uppercase tracking-widest block mb-1">
          {dict.card?.final_price || "Precio de referencia"}
        </span>
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <span className="text-4xl font-bold text-[#0a0e14] tracking-tight leading-none">
            {formatCurrencyString(currentPrice, laptop.currency)}
          </span>
        </div>
        <p className="text-[10px] text-[#9aa1ac] leading-tight mb-6 max-w-sm">
          {dict.card?.priceDisclaimer ||
            "Precio referencial · el vigente es el de la tienda al momento de comprar"}
        </p>

        {/* CTA sólido (NVIDIA) */}
        {hasValidUrl ? (
          <>
            <a
              href={monetizedUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="btn-nvidia inline-flex items-center gap-2 px-7 py-3.5 text-sm"
            >
              <ShoppingCart size={15} />
              {dict.card?.buy_at || "Comprar en"} {retailerName}
            </a>
            <p className="text-[10px] text-[#9aa1ac] mt-3">
              {dict.card?.affiliateNote || "Enlace de afiliado · podemos ganar una comisión"}
            </p>
          </>
        ) : (
          <div className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold rounded-[2px] bg-[#f5f6f8] text-[#9aa1ac] border border-[#e6e8ec] cursor-not-allowed select-none">
            <ShoppingCart size={15} />
            {dict.card?.unavailable || "Enlace no disponible"}
          </div>
        )}
      </div>

      {/* Columna de imagen */}
      <div className="order-1 md:order-2 relative aspect-[4/3] rounded bg-gradient-to-b from-[#f5f6f8] to-[#eef0f3] border border-[#e6e8ec] overflow-hidden">
        <ProductImage
          src={laptop.urls?.image}
          alt={`${laptop.brand} ${laptop.name}`}
          productType={laptop.product_type}
          quality={90}
          sizes="(max-width: 768px) 100vw, 50vw"
          imageClassName="object-contain p-8 drop-shadow-2xl"
          iconSize={88}
        />
      </div>
    </div>
  );
}

/* ── Sección completa ───────────────────────────────────────────────── */
export default function AIDealsSection({ laptops, countryCode = "AR", dict }: AIDealsSectionProps) {
  // Orden de exhibición por el score que YA calculó Rust/Rails (no es
  // matemática de negocio — es elegir qué mostrar primero).
  const topDeals = useMemo(() => {
    if (!Array.isArray(laptops)) return [];
    return [...laptops]
      .sort((a, b) => (b.intelligence?.deal_score ?? 0) - (a.intelligence?.deal_score ?? 0))
      .slice(0, 3);
  }, [laptops]);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autoplay solo si el usuario no pidió menos movimiento. En SSR se asume
  // "reducido" (sin animación) y el cliente lo corrige al hidratar.
  const prefersReduced = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true
  );
  const autoplay = !prefersReduced && topDeals.length > 1;

  const goTo = useCallback((idx: number, total: number) => {
    setActive(((idx % total) + total) % total);
  }, []);

  // Avance automático — reinicia con cada cambio de slide o pausa.
  useEffect(() => {
    if (!autoplay || paused || topDeals.length < 2) return;
    timerRef.current = setTimeout(() => {
      setActive((prev) => (prev + 1) % topDeals.length);
    }, SLIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, autoplay, paused, topDeals.length]);

  if (topDeals.length === 0) return null;
  const current = topDeals[Math.min(active, topDeals.length - 1)];

  return (
    <section
      className="w-full relative z-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header de sección + flechas cuadradas (layout NVIDIA) */}
      <div className="flex items-end justify-between mb-8 gap-4">
        <div className="flex flex-col">
          <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-2">
            {dict.deals?.eyebrow || "Destacados del día"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0a0e14] tracking-tight">
            {dict.deals?.title || "Las Mejores Ofertas"}
          </h2>
          <p className="text-sm text-[#6b7280] mt-2">
            {dict.deals?.subtitle || "Seleccionadas para tu región hoy"}
          </p>
        </div>
        {topDeals.length > 1 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={() => goTo(active - 1, topDeals.length)}
              className="carousel-arrow"
              aria-label="Oferta anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goTo(active + 1, topDeals.length)}
              className="carousel-arrow"
              aria-label="Oferta siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Escenario — key remonta el stage por deal (estado de imagen fresco) */}
      <div className="bg-white border border-[#e6e8ec] rounded-md card-bloom p-6 sm:p-10 mb-6">
        <DealStage key={current.id} laptop={current} countryCode={countryCode} dict={dict} />
      </div>

      {/* Tab-bar con barra de progreso (firma NVIDIA) */}
      {topDeals.length > 1 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${topDeals.length}, minmax(0, 1fr))` }} role="tablist">
          {topDeals.map((deal, i) => {
            const isActive = i === active;
            return (
              <button
                key={deal.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => goTo(i, topDeals.length)}
                className="text-left group cursor-pointer select-none"
              >
                {/* Línea superior: base gris + progreso azul animado */}
                <div className="h-[3px] w-full bg-[#e6e8ec] mb-3 overflow-hidden rounded-full">
                  {isActive && (
                    <div
                      key={`progress-${active}`}
                      className="h-full bg-blue-600"
                      style={
                        autoplay
                          ? {
                              animation: `progressBar ${SLIDE_MS}ms linear forwards`,
                              animationPlayState: paused ? "paused" : "running",
                            }
                          : { width: "100%" }
                      }
                    />
                  )}
                </div>
                {/* Precio, sin claim de ahorro (ver nota legal arriba) */}
                <span className={`block text-[9px] font-black uppercase tracking-widest mb-1 transition-colors duration-200 ${isActive ? "text-blue-600" : "text-[#9aa1ac] group-hover:text-[#6b7280]"}`}>
                  {formatCurrencyString(deal.financials?.current_price || 0, deal.currency)}
                </span>
                <span className={`block text-xs sm:text-sm font-semibold leading-snug line-clamp-2 transition-colors duration-200 ${isActive ? "text-[#0a0e14]" : "text-[#6b7280] group-hover:text-[#414855]"}`}>
                  {deal.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

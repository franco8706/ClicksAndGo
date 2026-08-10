"use client";

import React, { useTransition } from "react";
import ProductImage from "@/components/ProductImage";
import { ShoppingCart, ChevronDown, ChevronUp, Star, Heart } from "lucide-react";
import { formatCurrencyString } from "@/lib/currency";
import { recordSignal } from "@/lib/affinity";
import { isPromoExpired } from "@/components/EventBanner";
import type { Laptop, AIScoreLabel } from "@/types/laptop";
import { SPEC_SCHEMA, specSchemaFor, formatSpec, type ProductType } from "@/types/product";
import type { Dict } from "@/types/dictionary";

interface LaptopCardProps {
  readonly laptop: Laptop;
  readonly dict: Dict;
  readonly locale: string;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  /** Estado de favorito del usuario logueado (undefined = sin sesión) */
  readonly isFavorite?: boolean;
  /** Server action para agregar/quitar de favoritos (redirige a login sin sesión) */
  readonly toggleFavoriteAction?: (laptopId: string) => Promise<void>;
}

/* ── Specs por tipo de producto (multi-producto) ───────────────────────────
   Lee `product.specs` (genérico, llenado por Rails para cualquier tipo) y,
   como respaldo para laptops viejas, `product.hardware`. Devuelve pares
   {label, value} ya localizados y formateados según SPEC_SCHEMA.
─────────────────────────────────────────────────────────────────────────── */
function buildSpecEntries(product: Laptop, dict: Dict): { label: string; value: string }[] {
  const type = (product.product_type || "laptop") as ProductType;
  const schema = specSchemaFor(type);
  const source: Record<string, unknown> =
    product.specs && Object.keys(product.specs).length > 0
      ? (product.specs as Record<string, unknown>)
      : ((product.hardware || {}) as Record<string, unknown>);
  const specsDict = (dict.specs ?? {}) as Record<string, string>;

  return schema.flatMap((f) => {
    const value = formatSpec(f, source[f.key]);
    if (!value) return [];
    const label = specsDict[f.labelKey] || f.labelKey;
    return [{ label, value }];
  });
}

/* ── Descripción determinista (locale-aware, multi-producto) ────────────────
   Línea de specs + un caso de uso: para laptops/desktops se deriva de la
   categoría UX; para el resto de tipos, un tagline por tipo.
─────────────────────────────────────────────────────────────────────────── */
function buildDescription(product: Laptop, dict: Dict): string {
  const type = (product.product_type || "laptop") as ProductType;
  const entries = buildSpecEntries(product, dict);
  const specLine = entries
    .map((e) => (e.value === "✓" ? e.label : `${e.label}: ${e.value}`))
    .join(" · ");

  const cardDict = (dict.card ?? {}) as Record<string, string>;

  if (type === "laptop" || type === "desktop") {
    const category = (
      product.intelligence?.category ||
      product.metadata_extra?.category ||
      "business"
    ).toLowerCase();
    const USE_CASE: Record<string, string> = {
      gaming:      cardDict.descGaming      || "Ideal para gaming, streaming y apps aceleradas por GPU.",
      business:    cardDict.descBusiness    || "Pensada para trabajo profesional, videollamadas y productividad diaria.",
      workstation: cardDict.descWorkstation || "Diseñada para render 3D, procesamiento de datos y cargas pesadas.",
      creator:     cardDict.descCreator     || "Ideal para edición de video, foto RAW y diseño digital.",
      ultrabook:   cardDict.descUltrabook   || "Delgada, silenciosa y portátil — perfecta para trabajo remoto.",
      budget:      cardDict.descBudget      || "Gran relación precio/rendimiento para el día a día.",
      student:     cardDict.descStudent     || "Perfecta para apuntes, cursada e investigación académica.",
    };
    return `${specLine}. ${USE_CASE[category] || USE_CASE.business}`;
  }

  const taglineDict = (dict.typeTagline ?? {}) as Record<string, string>;
  const tagline = taglineDict[type] || "";
  return tagline ? `${specLine}. ${tagline}` : `${specLine}.`;
}

/* Etiqueta corta del tipo de producto para el badge de la card. */
function productTypeLabel(product: Laptop, dict: Dict): string {
  const type = (product.product_type || "laptop") as ProductType;
  const cats = (dict.categories ?? {}) as Record<string, string>;
  return cats[type] || type;
}

/* Señal de precio del backend (ai_score_label) → texto localizado.
   El serializer emite los valores en español; ai_labels usa claves EN. */
const AI_LABEL_KEY: Record<AIScoreLabel, string> = {
  "ÓPTIMO": "OPTIMAL",
  "BUENO": "GOOD",
  "REGULAR": "REGULAR",
  "BAJO": "LOW",
};
function priceSignal(product: Laptop, dict: Dict): { text: string; positive: boolean } | null {
  const label = product.intelligence?.ai_score_label;
  if (!label) return null;
  const labels = (dict.ai_labels ?? {}) as Record<string, string>;
  const text = labels[AI_LABEL_KEY[label] || ""];
  if (!text) return null;
  // Solo las señales que empujan la compra se muestran (ÓPTIMO/BUENO);
  // "precio elevado" no aporta en la card (sí en el detalle).
  if (label !== "ÓPTIMO" && label !== "BUENO") return null;
  return { text, positive: label === "ÓPTIMO" };
}

export default function LaptopCard({
  laptop, dict, isExpanded, onToggle, isFavorite, toggleFavoriteAction,
}: LaptopCardProps) {
  const [favPending, startFavTransition] = useTransition();

  // Señales de afinidad: locales al navegador (ver lib/affinity.ts).
  const signalInfo = { product_type: laptop.product_type || "laptop", brand: laptop.brand };

  const handleToggleFavorite = () => {
    if (!toggleFavoriteAction) return;
    recordSignal("favorite", signalInfo);
    startFavTransition(async () => {
      await toggleFavoriteAction(String(laptop.id));
    });
  };

  const currentPriceLocal = laptop.financials?.current_price || 0;
  const exchangeRate       = laptop.financials?.applied_exchange_rate;
  const usdReference =
    laptop.currency !== "USD" && exchangeRate && exchangeRate > 0
      ? currentPriceLocal / exchangeRate
      : null;

  /* ── ⚖️ Sin claim de descuento (cumplimiento legal) ────────────────
     NO se muestra "% OFF" ni precio tachado. El `original_price` que
     entrega el pipeline es el precio de lista del retailer (MSRP), no
     "el precio más bajo de los últimos 30 días" que exige la Directiva
     Omnibus UE (art. 6a) para anunciar una reducción; además Amazon
     exige que todo precio provenga de PAAPI, tenga <24h y lleve el
     disclaimer "as of [fecha]" — hoy la ingesta corre 1×/día y no hay
     timestamp en el DTO. Reponer solo cuando Rails exponga el mínimo
     real de 30 días desde `price_histories` + la marca temporal.
     Ver Docs/redesign_plan.md.
     Tampoco se muestra "Precio bajó": `price_trend: "down"` del DTO
     significa `current < original_price` (MSRP), NO una bajada real en
     el tiempo — mismo problema Omnibus. Reponer cuando el trend se
     calcule contra `price_histories`. */
  const outOfStock    = laptop.financials?.in_stock === false;
  const signal        = priceSignal(laptop, dict);

  const score             = laptop.intelligence?.deal_score || 0;
  const isGranOportunidad = score >= 8.5;
  const retailerName      = laptop.metadata_extra?.retailer
    ?.replace(/_(ar|es|us|mx|br|co|cl)$/i, "")
    .replace(/_/g, " ")
    .toUpperCase() || "TIENDA OFICIAL";

  const rawUrl      = laptop.urls?.affiliate_raw;
  const hasValidUrl = !!rawUrl && rawUrl !== "#" && rawUrl.startsWith("http");
  const monetizedUrl = hasValidUrl ? `/out?url=${encodeURIComponent(rawUrl)}` : null;

  const description = buildDescription(laptop, dict);
  const typeLabel   = productTypeLabel(laptop, dict);

  /* Evento comercial detectado por el agente (Vertex/Gemini/Antigravity
     vía Python → Rails): si el producto participa de un Hot Sale /
     CyberMonday activo, se muestra el chip sobre la imagen.
     isPromoExpired() lo suprime si `promo_ends_at` ya pasó (dato viejo). */
  const promoEvent =
    laptop.metadata_extra?.is_promo_season &&
    !isPromoExpired(laptop.metadata_extra) &&
    typeof laptop.metadata_extra?.promo_event === "string" &&
    laptop.metadata_extra.promo_event !== "Standard"
      ? laptop.metadata_extra.promo_event
      : null;

  return (
    <div
      className={`bg-white rounded-md border lift-card flex flex-col overflow-hidden group ${
        isExpanded
          ? "border-blue-400 shadow-md"
          : isGranOportunidad
          ? "border-emerald-300 hover:border-emerald-400"
          : "border-[#e6e8ec]"
      }`}
    >
      {/* ── Brand + tipo + Score ── */}
      <div className="p-5 pb-0 flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-blue-600 text-xs font-semibold uppercase tracking-widest">
            {laptop.brand}
          </span>
          <span className="w-fit text-[9px] font-bold uppercase tracking-wider text-[#6b7280] bg-[#f5f6f8] border border-[#e6e8ec] rounded-[2px] px-1.5 py-0.5">
            {typeLabel}
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
            isGranOportunidad
              ? "bg-emerald-50 border-emerald-200"
              : "bg-[#f5f6f8] border-[#e6e8ec]"
          }`}
        >
          <Star
            size={11}
            className={isGranOportunidad ? "text-emerald-500 fill-emerald-500" : "text-[#9aa1ac]"}
          />
          <span className={`text-[10px] font-semibold tracking-wide ${isGranOportunidad ? "text-emerald-700" : "text-[#414855]"}`}>
            {score.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* ── Imagen ── */}
      {/* `sheen` barre una luz diagonal al pasar el mouse. Va acá y no en la
          card entera para que el brillo recorra la superficie visual y no
          pase por encima del precio y el CTA. */}
      <div className="relative aspect-video border-b border-[#e6e8ec] overflow-hidden sheen">
        {/* Chip de evento comercial activo (dato del agente de mercado) */}
        {promoEvent && (
          <span className="absolute top-3 left-3 z-10 bg-[#0a0e14] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[2px] select-none pop-in">
            {promoEvent}
          </span>
        )}
        {/* ♥ Guardar en favoritos (dashboard del usuario) */}
        {toggleFavoriteAction && (
          <button
            onClick={handleToggleFavorite}
            disabled={favPending}
            title={
              isFavorite
                ? dict.dashboard?.removeFromFavorites || "Quitar de favoritos"
                : dict.dashboard?.saveToFavorites || "Guardar en favoritos"
            }
            aria-label={
              isFavorite
                ? dict.dashboard?.removeFromFavorites || "Quitar de favoritos"
                : dict.dashboard?.saveToFavorites || "Guardar en favoritos"
            }
            className={`absolute top-3 right-3 z-10 p-2 rounded-full border backdrop-blur-sm cursor-pointer disabled:opacity-60 pressable hover:scale-110 transition-[color,background-color,border-color,transform] duration-200 ${
              isFavorite
                ? "bg-red-50 border-red-200 text-red-500"
                : "bg-white/80 border-[#e6e8ec] text-[#9aa1ac] hover:text-red-500 hover:border-red-200"
            }`}
          >
            {/* `key` fuerza el remount al cambiar de estado: así el rebote de
                `pop-in` se dispara en cada alternancia y el click se siente
                confirmado, en vez de que el ícono cambie de color sin más. */}
            <Heart
              key={isFavorite ? "on" : "off"}
              size={15}
              className={isFavorite ? "fill-current pop-in" : ""}
            />
          </button>
        )}
        <ProductImage
          src={laptop.urls?.image}
          alt={`${laptop.brand} ${laptop.name}`}
          productType={laptop.product_type}
          quality={85}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          imageClassName="object-contain transform group-hover:scale-105 transition-transform duration-700 p-4 drop-shadow-2xl"
          iconSize={52}
        />
      </div>

      {/* ── Card body ── */}
      <div className="p-5 flex flex-col flex-1">

        {/* Nombre */}
        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.8rem] mb-4 text-[#0a0e14] group-hover:text-blue-600 transition-colors leading-snug">
          {laptop.name}
        </h3>

        {/* ── Precio (sin claim de descuento — ver nota legal arriba) ── */}
        <div className="mt-auto mb-4">
          <span className="text-[9px] font-semibold text-[#9aa1ac] uppercase tracking-widest mb-1 block">
            {dict.card?.final_price || "Precio de referencia"}
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-[#0a0e14] leading-none tracking-tight">
              {formatCurrencyString(currentPriceLocal, laptop.currency)}
            </span>
          </div>
          {usdReference && (
            <span className="text-[10px] text-[#9aa1ac] mt-1 block">
              {dict.card?.usd_ref || "Ref"}: U$D{" "}
              {usdReference.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          )}
          {/* Señal editorial del backend (opinión del scoring, no un hecho) */}
          {signal && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold leading-none ${signal.positive ? "text-emerald-600" : "text-[#6b7280]"}`}>
                {signal.text}
              </span>
            </div>
          )}
          {/* ⚖️ Disclaimer de precio contiguo al dato (exigencia de Amazon
              Associates y buena práctica FTC/Omnibus: el precio mostrado es
              referencial y el vigente es el de la tienda al comprar). */}
          <p className="text-[9px] text-[#9aa1ac] leading-tight mt-1.5">
            {dict.card?.priceDisclaimer ||
              "Precio referencial · el vigente es el de la tienda al momento de comprar"}
          </p>
        </div>

        {/* Botón de compra (sin stock → informativo, no clickeable) */}
        {hasValidUrl && outOfStock && (
          <div className="w-full mb-3 bg-[#f5f6f8] text-[#9aa1ac] font-semibold text-[11px] py-2.5 rounded-[2px] flex items-center justify-center gap-1.5 border border-[#e6e8ec] cursor-not-allowed select-none uppercase tracking-wider">
            <ShoppingCart size={12} />
            {dict.card?.outOfStock || "Sin stock"}
          </div>
        )}
        {hasValidUrl && !outOfStock && (
          <a
            href={monetizedUrl!}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => recordSignal("buy_click", signalInfo)}
            className="w-full mb-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[11px] py-2.5 rounded-[2px] flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
          >
            <ShoppingCart size={12} />
            {dict.card?.buy_at || "Comprar en"} {retailerName}
          </a>
        )}

        {/* Divulgación de afiliado (FTC/RGPD) — visible y contigua al enlace */}
        {hasValidUrl && !outOfStock && (
          <p className="text-[9px] text-[#9aa1ac] text-center mb-3 -mt-1 leading-tight">
            {dict.card?.affiliateNote || "Enlace de afiliado · podemos ganar una comisión"}
          </p>
        )}

        {!hasValidUrl && (
          <div className="w-full mb-3 bg-[#f5f6f8] text-[#9aa1ac] font-semibold text-[11px] py-2.5 rounded-[2px] flex items-center justify-center gap-1.5 border border-[#e6e8ec] cursor-not-allowed select-none uppercase tracking-wider">
            <ShoppingCart size={12} />
            {dict.card?.unavailable || "Enlace no disponible"}
          </div>
        )}

        {/* Botón "Ver descripción" */}
        <button
          onClick={() => {
            if (!isExpanded) recordSignal("expand", signalInfo);
            onToggle();
          }}
          className={`flex items-center justify-center py-2.5 rounded-[2px] transition-all duration-200 border cursor-pointer ${
            isExpanded
              ? "text-blue-600 bg-blue-50 border-blue-200"
              : "text-[#6b7280] bg-[#f5f6f8] hover:bg-[#eef0f3] border-[#e6e8ec] hover:border-[#d3d7dd] hover:text-[#0a0e14]"
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider mr-1.5">
            {isExpanded
              ? dict.card?.hide_description || "Ocultar descripción"
              : dict.card?.view_description  || "Ver descripción"}
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Panel de descripción expandido ── */}
      <div
        className={`bg-[#f5f6f8] transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded
            ? "max-h-[360px] opacity-100 py-5 border-t border-[#e6e8ec]"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5">
          <p className="text-[#414855] text-[12px] leading-relaxed font-normal">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShoppingCart, ChevronDown, ChevronUp, Star } from "lucide-react";
import { formatCurrencyString } from "@/lib/currency";
import type { Laptop } from "@/types/laptop";

interface LaptopCardProps {
  readonly laptop: Laptop;
  readonly dict: any;
  readonly locale: string;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=85&auto=format&fit=crop";

/* ── Generador de descripción determinista (siempre locale-aware) ──────────
   Usa exclusivamente specs reales + claves del dict localizado.
   ai_reasoning se omite: está almacenado en un idioma fijo en la BD.
─────────────────────────────────────────────────────────────────────────── */
function buildDescription(laptop: Laptop, dict: any): string {
  const { cpu, ram_gb, storage_gb, gpu, display_inches, weight_kg, battery_wh } =
    laptop.hardware;
  const category = (
    (laptop.intelligence as any)?.category ||
    laptop.metadata_extra?.category ||
    "business"
  ).toLowerCase();

  const USE_CASE: Record<string, string> = {
    gaming:      dict.card?.descGaming      || "Ideal for gaming, streaming and GPU-accelerated applications.",
    business:    dict.card?.descBusiness    || "Built for professional work, video calls and daily productivity.",
    workstation: dict.card?.descWorkstation || "Designed for 3D rendering, data processing and heavy CPU/GPU workloads.",
    creator:     dict.card?.descCreator     || "Ideal for video editing, RAW photo processing and digital design.",
    ultrabook:   dict.card?.descUltrabook   || "Slim, quiet and portable — perfect for commuters and remote workers.",
    budget:      dict.card?.descBudget      || "Solid price-to-performance for everyday tasks and web browsing.",
    student:     dict.card?.descStudent     || "Perfect for note-taking, coursework, research and academic projects.",
  };
  const useCase = USE_CASE[category] || USE_CASE.business;

  const gpuLower = (gpu || "").toLowerCase();
  const hasDiscreteGpu =
    gpuLower.length > 0 &&
    !gpuLower.includes("intel uhd") &&
    !gpuLower.includes("intel iris") &&
    !gpuLower.includes("integrada") &&
    !gpuLower.includes("integrated");

  const gpuPart    = hasDiscreteGpu ? `, GPU ${gpu}` : "";
  const screenPart = display_inches ? `, ${display_inches}"` : "";
  const weightPart = !hasDiscreteGpu && weight_kg ? `, ${weight_kg} kg` : "";
  const battPart   = !hasDiscreteGpu && !weight_kg && battery_wh ? `, ${battery_wh} Wh` : "";

  const specs = `${cpu}, ${ram_gb} GB RAM, SSD ${storage_gb} GB${gpuPart}${screenPart}${weightPart}${battPart}.`;
  return `${specs} ${useCase}`;
}

export default function LaptopCard({ laptop, dict, locale, isExpanded, onToggle }: LaptopCardProps) {
  const normalizeImg = (url?: string) =>
    (url || FALLBACK_IMAGE).replace(/^http:\/\//, "https://");
  const [imgSrc, setImgSrc] = useState(normalizeImg(laptop.urls?.image));

  const currentPriceLocal = laptop.financials?.current_price || 0;
  const exchangeRate       = laptop.financials?.applied_exchange_rate;
  const usdReference =
    laptop.currency !== "USD" && exchangeRate && exchangeRate > 0
      ? currentPriceLocal / exchangeRate
      : null;

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

  return (
    <div
      className={`bg-[#0d1117]/80 rounded-[2rem] border transition-all duration-300 flex flex-col overflow-hidden shadow-2xl group ${
        isExpanded
          ? "border-blue-500/50 shadow-[0_0_32px_rgba(59,130,246,0.14)]"
          : isGranOportunidad
          ? "border-emerald-500/30 hover:border-emerald-400/50"
          : "border-gray-800/80 hover:border-gray-700/60"
      }`}
    >
      {/* ── Brand + Score ── */}
      <div className="p-5 pb-0 flex items-start justify-between">
        <span className="text-blue-500 text-xs font-semibold uppercase tracking-widest">
          {laptop.brand}
        </span>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
            isGranOportunidad
              ? "bg-emerald-950/80 border-emerald-800/60"
              : "bg-gray-950/80 border-gray-800"
          }`}
        >
          <Star
            size={11}
            className={isGranOportunidad ? "text-emerald-400 fill-emerald-400" : "text-gray-400"}
          />
          <span className={`text-[10px] font-semibold tracking-wide ${isGranOportunidad ? "text-emerald-400" : "text-gray-300"}`}>
            {score.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* ── Imagen ── */}
      <div className="relative aspect-video bg-gradient-to-b from-gray-900/30 to-gray-950/60 border-b border-gray-800/40 overflow-hidden">
        <Image
          src={imgSrc}
          alt={`${laptop.brand} ${laptop.name}`}
          fill
          quality={90}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-contain transform group-hover:scale-105 transition-transform duration-700 p-4 drop-shadow-2xl"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
        />
      </div>

      {/* ── Card body ── */}
      <div className="p-5 flex flex-col flex-1">

        {/* Nombre */}
        <h3 className="text-sm font-medium line-clamp-2 min-h-[2.8rem] mb-4 text-white/90 group-hover:text-blue-400 transition-colors leading-snug">
          {laptop.name}
        </h3>

        {/* Precio */}
        <div className="mt-auto mb-4">
          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mb-1 block">
            {dict.card?.final_price || "Precio Verificado"}
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white leading-none">
              {formatCurrencyString(currentPriceLocal, laptop.currency)}
            </span>
            {usdReference && (
              <span className="text-[10px] text-gray-500 mt-1 block">
                {dict.card?.usd_ref || "Ref"}: U$D{" "}
                {usdReference.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>

        {/* Botón de compra */}
        {hasValidUrl ? (
          <a
            href={monetizedUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mb-3 bg-blue-600/45 backdrop-blur-sm hover:bg-blue-600/70 active:bg-blue-700/65 border border-blue-500/30 text-white font-semibold text-[11px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider shadow-md shadow-blue-500/15"
          >
            <ShoppingCart size={12} />
            {dict.card?.buy_at || "Comprar en"} {retailerName}
          </a>
        ) : (
          <div className="w-full mb-3 bg-gray-800/50 text-gray-600 font-semibold text-[11px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-gray-700/50 cursor-not-allowed select-none uppercase tracking-wider">
            <ShoppingCart size={12} />
            {dict.card?.unavailable || "Enlace no disponible"}
          </div>
        )}

        {/* Botón "Ver descripción" */}
        <button
          onClick={onToggle}
          className={`flex items-center justify-center py-2.5 rounded-xl transition-all duration-200 border cursor-pointer ${
            isExpanded
              ? "text-blue-400 bg-blue-950/50 border-blue-700/50"
              : "text-gray-500 bg-gray-900/30 hover:bg-gray-800/40 border-gray-800/60 hover:border-gray-700/60 hover:text-gray-300"
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
        className={`bg-gray-950/95 transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded
            ? "max-h-[360px] opacity-100 py-5 border-t border-blue-800/30"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5">
          <p className="text-gray-300 text-[12px] leading-relaxed font-normal">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

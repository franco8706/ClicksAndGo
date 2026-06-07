"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Cpu, Box, HardDrive, ShoppingCart, ChevronDown, ChevronUp, Star } from "lucide-react";
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

  // Validación estricta: solo URLs absolutas van al gateway /out
  const rawUrl      = laptop.urls?.affiliate_raw;
  const hasValidUrl = !!rawUrl && rawUrl !== "#" && rawUrl.startsWith("http");
  const monetizedUrl = hasValidUrl
    ? `/out?url=${encodeURIComponent(rawUrl)}`
    : null;

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
      {/* ── Brand + Score ─────────────────────────────────────────────── */}
      <div className="p-6 pb-0 flex items-start justify-between">
        <span className="text-blue-500 text-xs font-black uppercase tracking-widest">
          {laptop.brand}
        </span>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${
            isGranOportunidad
              ? "bg-emerald-950/80 border-emerald-800/60"
              : "bg-gray-950/80 border-gray-800"
          }`}
        >
          <Star
            size={12}
            className={
              isGranOportunidad ? "text-emerald-400 fill-emerald-400" : "text-gray-400"
            }
          />
          <span
            className={`text-[11px] font-black tracking-wider ${
              isGranOportunidad ? "text-emerald-400" : "text-gray-300"
            }`}
          >
            {score.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* ── Product image ─────────────────────────────────────────────── */}
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

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-bold line-clamp-2 min-h-[3.5rem] mb-5 text-white group-hover:text-blue-400 transition-colors">
          {laptop.name}
        </h3>

        {/* Price */}
        <div className="mt-auto mb-5">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
            {dict.card?.final_price || "Precio Verificado"}
          </span>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">
              {formatCurrencyString(currentPriceLocal, laptop.currency)}
            </span>
            {usdReference && (
              <span className="text-xs font-semibold text-gray-500 mt-2 block">
                {dict.card?.usd_ref || "Ref"}: U$D{" "}
                {usdReference.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>

        {/* ── Buy button — SIEMPRE VISIBLE — CTA primario ───────────── */}
        {hasValidUrl ? (
          <a
            href={monetizedUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mb-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest shadow-lg shadow-blue-600/20"
          >
            <ShoppingCart size={14} />
            {dict.card?.buy_at || "Comprar en"} {retailerName}
          </a>
        ) : (
          <div className="w-full mb-3 bg-gray-800/50 text-gray-600 font-black text-xs py-4 rounded-xl flex items-center justify-center gap-2 border border-gray-700/50 cursor-not-allowed select-none">
            <ShoppingCart size={14} />
            {dict.card?.unavailable || "Enlace no disponible"}
          </div>
        )}

        {/* ── Specs toggle — acción secundaria ──────────────────────── */}
        <button
          onClick={onToggle}
          className={`flex items-center justify-center py-3 rounded-2xl transition-all duration-200 border cursor-pointer ${
            isExpanded
              ? "text-blue-400 bg-blue-950/50 border-blue-700/50"
              : "text-gray-500 bg-gray-900/30 hover:bg-gray-800/40 border-gray-800/60 hover:border-gray-700/60 hover:text-gray-300"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-widest mr-2">
            {isExpanded
              ? dict.card?.hide_details || "Ocultar specs"
              : dict.card?.view_specs   || "Ver especificaciones"}
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* ── Expanded specs panel ──────────────────────────────────────── */}
      <div
        className={`bg-gray-950/95 transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded
            ? "max-h-[320px] opacity-100 py-6 border-t border-blue-800/30"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 space-y-3">
          <div className="flex items-center gap-3 text-gray-300 text-xs bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
            <Cpu size={14} className="text-blue-400 shrink-0" />
            <span className="truncate font-bold">{laptop.hardware?.cpu}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300 text-xs bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
            <Box size={14} className="text-cyan-400 shrink-0" />
            <span className="font-bold">
              {laptop.hardware?.ram_gb} {dict.card?.ram || "GB RAM"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-300 text-xs bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
            <HardDrive size={14} className="text-indigo-400 shrink-0" />
            <span className="font-bold">
              {laptop.hardware?.storage_gb} {dict.card?.ssd || "GB SSD"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

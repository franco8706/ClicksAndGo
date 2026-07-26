"use client";

/**
 * Cartel de evento comercial (Hot Sale · CyberMonday · Black Friday…).
 * La fuente es el sistema agéntico: el MarketIntelligenceAgent (Python)
 * mantiene con IA el calendario exacto de eventos por país/retailer y
 * marca cada producto con `is_promo_season`, `promo_event`,
 * `market_urgency` y `fomo_message`. Acá SOLO se agrega y muestra lo
 * que ya viajó en el DTO — cero lógica de negocio en el frontend.
 */

import React, { useMemo } from "react";
import { Flame, Clock } from "lucide-react";
import type { Laptop } from "@/types/laptop";
import type { Dict } from "@/types/dictionary";

interface EventBannerProps {
  readonly laptops: Laptop[];
  readonly dict: Dict;
}

interface ActiveEvent {
  name: string;
  message: string;
  urgency: string;
  count: number; // productos alcanzados por el evento
}

/**
 * 🛡️ Guarda de vencimiento: si el agente informó `promo_ends_at` y esa
 * fecha ya pasó, el evento NO se muestra — aunque la ingesta que
 * refresca los productos se haya atrasado. Comparación de fechas para
 * validez de display (higiene presentacional, no lógica de negocio).
 */
export function isPromoExpired(meta: Laptop["metadata_extra"]): boolean {
  const ends = meta?.promo_ends_at;
  if (typeof ends !== "string" || !ends) return false; // sin dato: se confía en el backend
  const endDate = new Date(`${ends}T23:59:59`);
  return !Number.isNaN(endDate.getTime()) && endDate.getTime() < Date.now();
}

/** Agrega el evento dominante del catálogo cargado (el más frecuente). */
function dominantEvent(laptops: Laptop[]): ActiveEvent | null {
  const byEvent = new Map<string, ActiveEvent>();
  for (const l of laptops) {
    const meta = l.metadata_extra;
    if (!meta?.is_promo_season || isPromoExpired(meta)) continue;
    const name = typeof meta.promo_event === "string" ? meta.promo_event : "";
    const message = typeof meta.fomo_message === "string" ? meta.fomo_message : "";
    if (!name || name === "Standard" || !message) continue;
    const urgency = typeof meta.market_urgency === "string" ? meta.market_urgency : "MEDIUM";
    const prev = byEvent.get(name);
    if (prev) {
      prev.count += 1;
      // La urgencia más alta del batch manda (CRITICAL > HIGH > MEDIUM)
      const rank = (u: string) => (u === "CRITICAL" ? 3 : u === "HIGH" ? 2 : 1);
      if (rank(urgency) > rank(prev.urgency)) {
        prev.urgency = urgency;
        prev.message = message;
      }
    } else {
      byEvent.set(name, { name, message, urgency, count: 1 });
    }
  }
  if (byEvent.size === 0) return null;
  return [...byEvent.values()].sort((a, b) => b.count - a.count)[0];
}

export default function EventBanner({ laptops, dict }: EventBannerProps) {
  const event = useMemo(() => dominantEvent(laptops), [laptops]);
  if (!event) return null;

  const isLive = event.urgency === "CRITICAL" || event.urgency === "HIGH";

  return (
    <div className="relative overflow-hidden rounded-md bg-[#0a0e14] text-white card-bloom select-none">
      {/* Tinte de acento diagonal, sutil sobre tinta */}
      <div
        className={`absolute inset-y-0 right-0 w-1/2 opacity-20 pointer-events-none bg-gradient-to-l ${
          isLive ? "from-emerald-500" : "from-blue-600"
        } to-transparent`}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-6 sm:px-8 py-5">
        {/* Ícono según estado: en vivo (llama) o próximamente (reloj) */}
        <div
          className={`w-11 h-11 rounded flex items-center justify-center shrink-0 ${
            isLive ? "bg-emerald-500" : "bg-blue-600"
          }`}
        >
          {isLive ? <Flame size={22} className="text-white" /> : <Clock size={22} className="text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-base sm:text-lg font-bold tracking-tight uppercase">
              {event.name}
            </span>
            <span
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] ${
                isLive ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
              }`}
            >
              {isLive
                ? dict.events?.live || "En curso"
                : dict.events?.upcoming || "Muy pronto"}
            </span>
          </div>
          {/* Mensaje FOMO generado por el agente (ya localizable a futuro) */}
          <p className="text-xs sm:text-sm text-white/85 truncate">{event.message}</p>
        </div>

        <a
          href="#productos"
          className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] text-xs font-bold transition-colors ${
            isLive
              ? "bg-emerald-500 hover:bg-emerald-400 text-white"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {dict.events?.cta || "Ver ofertas del evento"}
        </a>
      </div>
    </div>
  );
}

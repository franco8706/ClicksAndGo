"use client";

import React, { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Radio } from "lucide-react";
import { HardwareNews } from "@/types/laptop";

// ── Editorial images by category — plain URLs, browser fetches directly (no SSR proxy) ──
const CAT_IMAGES: Record<string, string> = {
  ai:      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80&auto=format&fit=crop",
  gpu:     "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80&auto=format&fit=crop",
  server:  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80&auto=format&fit=crop",
  market:  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop",
};

const FALLBACK_IMG = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80&auto=format&fit=crop";

function getImage(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("ai") || c.includes("intel") || c.includes("neural")) return CAT_IMAGES.ai;
  if (c.includes("gpu") || c.includes("cpu") || c.includes("proc") || c.includes("nvidia") || c.includes("amd")) return CAT_IMAGES.gpu;
  if (c.includes("server") || c.includes("data") || c.includes("nube") || c.includes("cloud")) return CAT_IMAGES.server;
  if (c.includes("mercado") || c.includes("market") || c.includes("precio") || c.includes("oferta")) return CAT_IMAGES.market;
  return CAT_IMAGES.default;
}

const IMPACT_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border-red-500/40",
  HIGH:     "bg-amber-500/20 text-amber-300 border-amber-500/40",
  MEDIUM:   "bg-blue-500/20 text-blue-300 border-blue-500/40",
  LOW:      "bg-gray-700/40 text-gray-400 border-gray-600/40",
};

const CAT_COLORS = ["text-blue-400", "text-cyan-400", "text-indigo-400", "text-purple-400", "text-emerald-400"];

interface Props {
  readonly news: HardwareNews[];
  readonly dict?: any;
}

// ── News card ────────────────────────────────────────────────────────────────
function NewsCard({ item, colorIdx, readMoreLabel }: {
  item: HardwareNews;
  colorIdx: number;
  readMoreLabel: string;
}) {
  const [src, setSrc] = useState(getImage(item.category));
  const [loaded, setLoaded] = useState(false);

  return (
    <article className="group cursor-pointer min-w-[300px] sm:min-w-[360px] snap-start flex-shrink-0 bg-[#0d1117] border border-gray-800/70 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-blue-500/10">

      {/* Image area */}
      <div className="relative h-[200px] overflow-hidden bg-gray-950">
        {/* Shimmer while loading */}
        {!loaded && (
          <div className="absolute inset-0 skeleton-shimmer" />
        )}
        {/* Plain <img> — browser fetches directly, no Next.js SSR proxy needed */}
        <img
          src={src}
          alt={item.category}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => { setSrc(FALLBACK_IMG); setLoaded(true); }}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ${loaded ? "opacity-75 group-hover:opacity-100" : "opacity-0"}`}
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/30 to-transparent" />

        {/* Impact badge */}
        {item.impactScore && (
          <div className="absolute bottom-3 right-3">
            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border backdrop-blur-sm ${IMPACT_BADGE[item.impactScore] ?? IMPACT_BADGE.MEDIUM}`}>
              {item.impactScore}
            </span>
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="p-5">
        <span className={`${CAT_COLORS[colorIdx % CAT_COLORS.length]} text-[10px] font-black uppercase tracking-widest`}>
          {item.category}
        </span>

        <h3 className="text-white font-bold text-[15px] mt-2 mb-3 group-hover:text-blue-400 transition-colors leading-snug line-clamp-2 min-h-[2.8rem]">
          {item.title}
        </h3>

        <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
          {item.summary}
        </p>

        {/* Reveal-on-hover CTA */}
        <div className="mt-4 flex items-center gap-1.5 text-blue-400 text-xs font-bold opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200">
          <span>{readMoreLabel}</span>
          <ArrowRight size={12} />
        </div>
      </div>
    </article>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function HardwareNewsSlider({ news, dict }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    sliderRef.current?.scrollBy({ left: dir === "left" ? -380 : 380, behavior: "smooth" });
  };

  if (!news || news.length === 0) return null;

  return (
    <section className="py-16 relative z-10">

      {/* ── Section header ── */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio size={13} className="text-blue-400" />
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">
              {dict?.news?.subtitle || "Últimas noticias y análisis de hardware"}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {dict?.news?.title || "Radar de Inteligencia"}
          </h2>
        </div>

        {/* Modern circular arrow buttons */}
        <div className="flex gap-3 shrink-0 ml-4">
          <button
            onClick={() => scroll("left")}
            aria-label="Anterior"
            className="w-11 h-11 rounded-full bg-gray-900 border border-gray-700/60 text-gray-400
                       hover:text-white hover:border-blue-500/50 hover:bg-blue-600/15
                       flex items-center justify-center transition-all duration-200 shadow-lg group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Siguiente"
            className="w-11 h-11 rounded-full bg-blue-600 border border-blue-500
                       text-white hover:bg-blue-500
                       flex items-center justify-center transition-all duration-200
                       shadow-lg shadow-blue-600/25 group"
          >
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── Scroll track ── */}
      <div
        ref={sliderRef}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {news.map((item, idx) => (
          <NewsCard
            key={idx}
            item={item}
            colorIdx={idx}
            readMoreLabel={dict?.news?.readMore || "Leer más"}
          />
        ))}
      </div>
    </section>
  );
}

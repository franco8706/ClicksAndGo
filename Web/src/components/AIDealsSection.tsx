import React, { useMemo } from "react";
import { TrendingDown, Sparkles } from "lucide-react";
import { Laptop } from "@/types/laptop";
import { formatCurrencyString } from "@/lib/currency";

interface DealRowProps {
  readonly laptop: Laptop;
  readonly countryCode: string;
  readonly dict: any;
}

function DealRow({ laptop, countryCode, dict }: DealRowProps) {
  const currentPrice  = laptop.financials?.current_price || 0;
  const originalPrice = laptop.financials?.original_price || currentPrice;
  const isGranOportunidad = (laptop.intelligence?.deal_score ?? 0) >= 8.5;
  const retailerName  = laptop.metadata_extra?.retailer?.toUpperCase() || laptop.brand;
  const savingsBase   = Math.max(0, originalPrice - currentPrice);

  const rawUrl      = laptop.urls?.affiliate_raw;
  const hasValidUrl = !!rawUrl && rawUrl !== "#" && rawUrl.startsWith("http");
  const monetizedUrl = hasValidUrl
    ? `/out?url=${encodeURIComponent(rawUrl)}&country=${countryCode}`
    : undefined;

  const rowClass =
    "group flex items-center gap-4 px-6 py-5 rounded-2xl bg-gray-900/40 hover:bg-gray-800/40 transition-colors border border-gray-800/80 shadow-md w-full mb-4 last:mb-0";

  const inner = (
    <>
      <div className="w-12 h-12 rounded-xl bg-black border border-gray-800/80 flex items-center justify-center shrink-0">
        <TrendingDown size={20} className="text-blue-500 group-hover:text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-white truncate mb-1">
          {laptop.name}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {retailerName}
          </span>
          {isGranOportunidad && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Sparkles size={10} className="fill-current" />
              {dict.deals?.hot || "GRAN OPORTUNIDAD"}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">
          {dict.deals?.youSave || "AHORRAS"}
        </p>
        <p className="text-lg md:text-xl font-black text-emerald-400">
          {savingsBase > 0
            ? `-${formatCurrencyString(savingsBase, laptop.currency)}`
            : dict.common?.viewDeal || "VER OFERTA"}
        </p>
      </div>
    </>
  );

  if (hasValidUrl) {
    return (
      <a href={monetizedUrl} target="_blank" rel="noopener noreferrer" className={rowClass}>
        {inner}
      </a>
    );
  }

  return (
    <div className={`${rowClass} opacity-50 cursor-not-allowed`}>
      {inner}
    </div>
  );
}

interface AIDealsSectionProps {
  readonly laptops: Laptop[];
  readonly countryCode?: string;
  readonly dict: any;
}

export default function AIDealsSection({ laptops, countryCode = "AR", dict }: AIDealsSectionProps) {
  const topDeals = useMemo(() => {
    if (!Array.isArray(laptops)) return [];
    return [...laptops]
      .sort((a, b) => (b.intelligence?.deal_score ?? 0) - (a.intelligence?.deal_score ?? 0))
      .slice(0, 3);
  }, [laptops]);

  if (topDeals.length === 0) return null;

  return (
    <section className="w-full relative z-10">
      <div className="flex flex-col mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🏷️</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {dict.deals?.title || "Radar de Oportunidades"}
          </h2>
        </div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-14">
          {dict.deals?.subtitle || "Selección algorítmica por Clicks & Go v4.0"}
        </p>
      </div>

      <div className="w-full">
        {topDeals.map((laptop) => (
          <DealRow key={laptop.id} laptop={laptop} countryCode={countryCode} dict={dict} />
        ))}
      </div>
    </section>
  );
}

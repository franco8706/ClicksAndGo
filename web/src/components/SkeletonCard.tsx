"use client";

/**
 * SkeletonCard - se muestra mientras los agentes de IA buscan / califican laptops.
 * Usa una animación puramente CSS vía Tailwind 'animate-pulse'.
 * Refleja exactamente el diseño de 'LaptopCard' para que la transición sea fluida.
 */
export function SkeletonCard() {
  return (
    <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      
      {/* Image placeholder */}
      <div className="h-36 mx-4 mt-4 rounded-lg bg-slate-800 animate-pulse" />

      <div className="flex flex-col p-4 gap-3">
        {/* Brand line */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-24 rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-48 rounded bg-slate-800 animate-pulse" />
        </div>

        {/* AI Score badge */}
        <div className="h-7 w-36 rounded bg-slate-800 animate-pulse" />

        {/* Spec pills */}
        <div className="flex gap-1.5">
          <div className="h-6 w-20 rounded bg-slate-800 animate-pulse" />
          <div className="h-6 w-14 rounded bg-slate-800 animate-pulse" />
          <div className="h-6 w-14 rounded bg-slate-800 animate-pulse" />
        </div>

        <div className="h-8" />

        {/* Price + CTA */}
        <div className="flex items-end justify-between pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <div className="h-6 w-20 rounded bg-slate-800 animate-pulse" />
            <div className="h-3 w-28 rounded bg-slate-800 animate-pulse" />
          </div>
          <div className="h-8 w-14 rounded-lg bg-slate-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Inline skeleton para el ticker de Ofertas IA */
export function SkeletonDealTicker() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-900 border border-slate-800">
      <div className="h-4 w-4 rounded-full bg-slate-800 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-3 w-3/4 rounded bg-slate-800 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-slate-800 animate-pulse" />
      </div>
      <div className="h-5 w-16 rounded bg-slate-800 animate-pulse" />
    </div>
  );
}
export default SkeletonCard;

/**
 * Esqueleto del panel mientras Next.js resuelve el Server Component.
 *
 * Por qué acá y no en el home: el home lo sirve el CDN cacheado (TTFB medido
 * 0,15–0,47 s), pero el panel es privado y por definición no se cachea. Además
 * encadena `updateGeo` + perfil + favoritos + alertas contra Rails, que corre
 * con `minScale: 0` — la primera visita tras un rato de inactividad paga el
 * arranque en frío. Sin este archivo, ese tiempo es una pantalla en blanco: el
 * navegador ya cambió de URL pero no hay nada pintado, y se lee como "se colgó".
 *
 * Las medidas replican el layout real de `panel/page.tsx` (mismo `max-w-5xl`,
 * mismo avatar de 80 px, misma grilla de 3 tarjetas) para que al llegar el
 * contenido no haya salto de layout.
 */
export default function PanelLoading() {
  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        {/* Encabezado: avatar + nombre */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-20 h-20 rounded-2xl skeleton-shimmer shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-56 max-w-full rounded-lg skeleton-shimmer" />
            <div className="h-4 w-40 max-w-full rounded skeleton-shimmer" />
          </div>
        </div>

        {/* Tres tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#e6e8ec] rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded skeleton-shimmer" />
                <div className="h-5 w-12 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Listado (favoritos / alertas) */}
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#e6e8ec] rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-16 h-16 rounded-xl skeleton-shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 max-w-sm rounded skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Lo único que se le dice a un lector de pantalla: que está cargando.
            El resto es decoración y no debe anunciarse pieza por pieza. */}
        <span className="sr-only" role="status" aria-live="polite">
          Cargando tu panel…
        </span>
      </div>
    </main>
  );
}

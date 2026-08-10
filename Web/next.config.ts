import type { NextConfig } from "next";
import { REMOTE_IMAGE_PATTERNS } from "./src/lib/imageHosts";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Catálogo principal: CDN cachea 60s, sirve stale hasta 5 min mientras revalida
        source: '/:locale(es|en|pt)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
          { key: 'Vary', value: 'Accept-Encoding' },
        ],
      },
      {
        // Detalle de laptop: cambia menos — CDN cachea 5 min, stale 1 hora
        source: '/:locale(es|en|pt)/laptop/:slug',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=3600' },
          { key: 'Vary', value: 'Accept-Encoding' },
        ],
      },
      {
        // Redirect de afiliados: nunca cachear (conteo de clics)
        source: '/out',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        // Imágenes optimizadas: CDN las cachea agresivamente
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2678400, immutable' },
        ],
      },
      {
        // JS/CSS buildados (hash inmutable en el nombre): caché permanente
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  images: {
    // 🖼️ Formatos modernos: AVIF/WebP entregan alta calidad con menor peso (mejor LCP)
    formats: ['image/avif', 'image/webp'],
    // Calidades permitidas (Next 16 exige declararlas explícitamente)
    qualities: [75, 85, 90, 95],
    // Cacheo agresivo del optimizador para soportar picos de tráfico
    minimumCacheTTL: 2678400, // 31 días
    // 🖼️ Allowlist de CDNs de producto — derivada de `src/lib/imageHosts.ts`,
    // que es la ÚNICA fuente de verdad. Antes esta lista vivía acá suelta y la
    // Web decidía si mostrar la foto con otro criterio (la denylist de stock),
    // así que un CDN de comerciante nuevo pasaba las capas 1-3 y moría acá con
    // un 400 silencioso: el 2026-08-10 eso ocultó 2555 de 2557 fotos reales.
    // Derivarla evita que los dos criterios vuelvan a divergir.
    remotePatterns: REMOTE_IMAGE_PATTERNS,
  },
};

export default nextConfig;
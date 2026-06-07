import type { NextConfig } from "next";

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
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.lenovo.com' },
      { protocol: 'https', hostname: '**.hp.com' },
      { protocol: 'https', hostname: '**.dell.com' },
      { protocol: 'https', hostname: '**.mlstatic.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: '**.awin1.com' },
      { protocol: 'https', hostname: '**.static.pub' },
      { protocol: 'https', hostname: '**.cdn-apple.com' },
      { protocol: 'https', hostname: '**.hptstore.com' }
    ],
  },
};

export default nextConfig;
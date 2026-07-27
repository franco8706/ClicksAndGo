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
    // 🖼️ Allowlist de CDNs de producto. Solo se optimizan imágenes de
    // retailers/fabricantes: los bancos de stock (Unsplash, placehold.co…)
    // están deliberadamente FUERA, así el optimizador rechaza con 400
    // cualquier foto decorativa que llegara a colarse en el DTO. Es la
    // última de las cuatro capas de la guarda de imágenes reales
    // (ingesta Python → CHECK en Postgres → serializer Rails → esto).
    remotePatterns: [
      { protocol: 'https', hostname: '**.lenovo.com' },
      { protocol: 'https', hostname: '**.hp.com' },
      { protocol: 'https', hostname: '**.dell.com' },
      { protocol: 'https', hostname: '**.mlstatic.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: '**.awin1.com' },
      { protocol: 'https', hostname: '**.static.pub' },
      { protocol: 'https', hostname: '**.cdn-apple.com' },
      { protocol: 'https', hostname: '**.hptstore.com' },
      // CDNs de fabricante que el pipeline puede devolver por feed de afiliado
      { protocol: 'https', hostname: '**.www8-hp.com' },
      { protocol: 'https', hostname: '**.msi.com' },
      { protocol: 'https', hostname: '**.asus.com' },
      { protocol: 'https', hostname: '**.acer.com' },
      { protocol: 'https', hostname: 'www.apple.com' },
      { protocol: 'https', hostname: '**.razer.com' },
      { protocol: 'https', hostname: 'hybrismediaprod.blob.core.windows.net' },
      // 👤 Avatares reales del proveedor OAuth (panel de usuario). Faltaban:
      // next/image aborta ante un host no declarado, así que la foto de perfil
      // de Google/Microsoft/Facebook no cargaba nunca.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'graph.microsoft.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' }
    ],
  },
};

export default nextConfig;
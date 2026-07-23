import type { MetadataRoute } from "next";

// Base pública del sitio. Lee de AUTH_URL (ya seteada en Cloud Run) para que
// cuando migremos al dominio propio, robots/sitemap apunten solos al dominio
// nuevo sin tocar código. Fallback: la URL de serving actual de Cloud Run.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://clicks-web-2myrvivvhq-uc.a.run.app"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Áreas privadas/funcionales: no aportan a SEO y no deben indexarse.
        // La pasarela /out es un redirect de afiliados (nunca contenido).
        disallow: [
          "/api/",
          "/out",
          "/es/login",
          "/en/login",
          "/pt/login",
          "/it/login",
          "/es/register",
          "/en/register",
          "/pt/register",
          "/it/register",
          "/es/panel",
          "/en/panel",
          "/pt/panel",
          "/it/panel",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

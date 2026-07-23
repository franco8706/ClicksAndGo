import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://clicks-web-2myrvivvhq-uc.a.run.app"
).replace(/\/$/, "");

const LOCALES = ["es", "en", "pt", "it"] as const;
const DEFAULT_LOCALE = "es";

// Solo páginas públicas indexables. login/register/panel quedan fuera (privadas).
// "" = home. Cada una existe en los 4 idiomas.
const PUBLIC_PATHS = [
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  { path: "/privacidad", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/terminos", changeFrequency: "monthly" as const, priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap(({ path, changeFrequency, priority }) => {
    // hreflang: mapa idioma → URL, compartido por las 3 variantes de la página.
    const languages = Object.fromEntries(
      LOCALES.map((loc) => [loc, `${SITE_URL}/${loc}${path}`])
    );

    return LOCALES.map((loc) => ({
      url: `${SITE_URL}/${loc}${path}`,
      lastModified,
      changeFrequency,
      // La variante en idioma por defecto pesa un poco más que sus traducciones.
      priority: loc === DEFAULT_LOCALE ? priority : Math.max(priority - 0.1, 0.1),
      alternates: { languages },
    }));
  });
}

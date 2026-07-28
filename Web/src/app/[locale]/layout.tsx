import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import "../globals.css";

import Navbar from "@/components/Navbar";
import ConsentBanner from "@/components/ConsentBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Cpu, Mail, ShieldCheck, MessageSquare, Briefcase, Code2 } from "lucide-react";
import { auth } from "@/auth";

import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";
import itDict from "@/dictionaries/it.json";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Misma resolución que sitemap.ts — una sola fuente de verdad para el dominio público.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.AUTH_URL ||
  "https://clicks-web-2myrvivvhq-uc.a.run.app"
).replace(/\/$/, "");

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : locale === "it" ? itDict : esDict;

  return {
    title: `Clicks & Go | ${dict.hero?.title1 || "Encuentra tu Laptop Ideal"}`,
    description: dict.footer?.description || "Innovación en hardware y auditoría agéntica distribuida.",
    // 🔍 Sin metadataBase, Next no puede resolver URLs relativas en `alternates`
    // — el hreflang de abajo se calculaba pero NUNCA se renderizaba en el HTML
    // servido (verificado 2026-07-28: 0 <link hreflang> en producción pese a
    // que este bloque "ya estaba arreglado" desde antes). Confirmado en vivo
    // por Search Console: "Duplicada: el usuario no ha indicado ninguna
    // versión canónica" — sin canonical ni hreflang, Google no podía distinguir
    // /es de /en de /pt de /it como versiones del mismo contenido.
    metadataBase: new URL(SITE_URL),
    alternates: {
      // Canonical AUTO-referenciado: cada idioma es dueño de su propia URL,
      // ninguno canoniza a otro (patrón correcto para sitios con hreflang).
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        'es': `${SITE_URL}/es`,
        'en': `${SITE_URL}/en`,
        'pt': `${SITE_URL}/pt`,
        'it': `${SITE_URL}/it`,
        // x-default: qué versión servir a un idioma no listado — mismo destino
        // que ya usa el middleware para países sin locale mapeado (getLocale → en).
        'x-default': `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title: "Clicks & Go Enterprise",
      description: dict.hero?.subtitle,
      siteName: "Clicks & Go",
    }
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : locale === "it" ? itDict : esDict;

  const session = await auth().catch(() => null);

  return (
    <html lang={locale} className={`${barlow.variable} ${barlowCondensed.variable} scroll-smooth`} suppressHydrationWarning>
      {/* Verificación de propiedad del sitio para Impact.com (red de afiliados).
          Se renderiza crudo (atributo `value=`, NO `content=`) porque el crawler
          de Impact busca específicamente `value`; la Metadata API de Next emite
          `content=` y la verificación fallaría. React 19 lo hoistea al <head>. */}
      <meta {...({ name: "impact-site-verification", value: "c697e065-b482-46fc-a612-d26eac2d1e18" } as Record<string, string>)} />
      <body className="antialiased font-sans min-h-screen flex flex-col transition-colors selection-premium">
        <ThemeProvider>

          <Navbar dict={dict} currentLocale={locale} session={session} />

          <main className="flex-grow flex flex-col">
            {children}
          </main>

          <footer className="bg-[#f5f6f8] text-[#414855] py-16 border-t border-[#e6e8ec] z-10 relative select-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-9 h-9 bg-[#0a0e14] rounded-md flex items-center justify-center mr-3">
                      <Cpu size={18} className="text-white stroke-[2.5]" />
                    </div>
                    <span className="text-[#0a0e14] font-extrabold text-xl tracking-tight">
                      Clicks <span className="text-blue-600">&</span> Go
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#6b7280]">{dict.footer?.description}</p>
                  <p className="text-[11px] text-[#9aa1ac] leading-relaxed">{dict.footer?.disclaimer}</p>
                </div>

                {/* Ítems con destino REAL (anclas del home + legales) — nada de
                    jerga técnica ni links muertos: es la cara pública. */}
                <div>
                  <h4 className="text-[#0a0e14] font-bold text-sm mb-4">{dict.footer?.resources || "La empresa"}</h4>
                  <ul className="space-y-2.5 text-sm text-[#6b7280]">
                    <li><Link href={`/${locale}/privacidad`} className="hover:text-blue-600 transition-colors">{dict.footer?.privacyFullLink || "Política de privacidad"}</Link></li>
                    <li><Link href={`/${locale}/terminos`} className="hover:text-blue-600 transition-colors">{dict.footer?.termsFullLink || "Términos y condiciones"}</Link></li>
                    <li><a href="mailto:info@clicks-and-go.com" className="hover:text-blue-600 transition-colors">{dict.footer?.contactLink || "Contactanos"}</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-[#0a0e14] font-bold text-sm mb-4">{dict.footer?.contact || "Contacto"}</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      <Mail size={14} className="text-blue-600 shrink-0" />
                      <span className="truncate text-[#414855] font-medium">info@clicks-and-go.com</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold tracking-wide text-[#6b7280]">Auditoría Clicks & Go v4.0</span>
                    </li>
                    <li className="flex space-x-4 pt-3">
                      <Link href="#" aria-label="Comunidad" className="text-[#9aa1ac] hover:text-[#0a0e14] transition-colors"><MessageSquare size={18} /></Link>
                      <Link href="#" aria-label="Negocios" className="text-[#9aa1ac] hover:text-[#0a0e14] transition-colors"><Briefcase size={18} /></Link>
                      <Link href="#" aria-label="Desarrollo" className="text-[#9aa1ac] hover:text-[#0a0e14] transition-colors"><Code2 size={18} /></Link>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Divulgación de afiliados global (FTC/RGPD) — visible en toda página */}
              <div className="border-t border-[#e6e8ec] pt-8 pb-6">
                <p className="text-[11px] leading-relaxed text-[#9aa1ac] max-w-4xl">
                  {dict.footer?.affiliateDisclosure ||
                    "Clicks & Go participa en programas de afiliados y puede recibir una comisión por compras hechas a través de sus enlaces, sin costo adicional para vos."}
                </p>
                {/* ⚖️ Declaración específica que exige el Operating Agreement de
                    Amazon Associates (§5), con el wording oficial por idioma. */}
                <p className="text-[11px] leading-relaxed text-[#9aa1ac] max-w-4xl mt-2">
                  {dict.footer?.amazonDisclosure ||
                    "En calidad de Afiliado de Amazon, Clicks & Go obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables."}
                </p>
              </div>

              <div className="border-t border-[#e6e8ec] pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#9aa1ac] gap-4">
                <p>{dict.footer?.copyright || "© 2026 Clicks & Go. All rights reserved."}</p>
                <div className="flex space-x-6">
                  <Link href={`/${locale}/privacidad`} className="hover:text-[#0a0e14] transition-colors">{dict.footer?.privacyLink || "Privacy"}</Link>
                  <Link href={`/${locale}/terminos`} className="hover:text-[#0a0e14] transition-colors">{dict.footer?.termsLink || "Terms"}</Link>
                </div>
              </div>

            </div>
          </footer>

          {/* ⚖️ Consentimiento ePrivacy para personalización local */}
          <ConsentBanner dict={dict} />

        </ThemeProvider>
      </body>
    </html>
  );
}
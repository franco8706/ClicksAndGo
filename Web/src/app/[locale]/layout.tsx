import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link"; // 🚀 FIX: Importado para mantener la navegación SPA sin recargar la página
import "../globals.css";

import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Cpu, Mail, ShieldCheck, MessageSquare, Briefcase, Code2 } from "lucide-react";

import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// 🅰️ Fuente display geométrica para titulares — identidad techy de alto impacto
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
  weight: ["500", "600", "700"],
});

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  return {
    title: `Clicks & Go | ${dict.hero?.title1 || "Encuentra tu Laptop Ideal"}`,
    description: dict.footer?.description || "Innovación en hardware y auditoría agéntica distribuida.",
    // 🚀 FIX SEO MUNDIAL: Etiquetas hreflang para que Google indexe correctamente cada idioma
    alternates: {
      languages: {
        'es': '/es',
        'en': '/en',
        'pt': '/pt',
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
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  return (
    <html lang={locale} className={`${inter.variable} ${spaceGrotesk.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen flex flex-col transition-colors selection-premium">
        <ThemeProvider>

          <Navbar dict={dict} currentLocale={locale} />

          <main className="flex-grow flex flex-col">
            {children}
          </main>

          <footer className="bg-black text-gray-400 py-16 border-t border-gray-900 z-10 relative select-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-500/10">
                      <Cpu size={18} className="text-black stroke-[2.5]" />
                    </div>
                    <span className="text-white font-extrabold text-xl tracking-tight uppercase">
                      Clicks <span className="text-blue-500">&</span> Go
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300">{dict.footer?.description}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{dict.footer?.disclaimer}</p>
                </div>

                <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">{dict.footer?.products || "Productos"}</h4>
                  <ul className="space-y-2.5 text-sm">
                    {/* 🚀 FIX SPA: Sustituido <a> por <Link> para evitar recarga de página (Full Page Reload) */}
                    <li><Link href={`/${locale}/#productos`} className="hover:text-blue-400 transition-colors">{dict.common?.gaming}</Link></li>
                    <li><Link href={`/${locale}/#productos`} className="hover:text-blue-400 transition-colors">{dict.common?.workstation}</Link></li>
                    <li><Link href={`/${locale}/#productos`} className="hover:text-blue-400 transition-colors">{dict.common?.ultrabook}</Link></li>
                    <li><Link href={`/${locale}/#productos`} className="hover:text-blue-400 transition-colors">{dict.common?.creator}</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">{dict.footer?.resources || "La empresa"}</h4>
                  <ul className="space-y-2.5 text-sm">
                    <li><Link href={`/${locale}/#productos`} className="hover:text-blue-400 transition-colors">{dict.footer?.howLink || "Cómo funciona"}</Link></li>
                    <li><Link href={`/${locale}/legal/affiliates`} className="hover:text-blue-400 transition-colors">{dict.footer?.affiliateLink || "Programa de afiliados"}</Link></li>
                    <li><Link href={`/${locale}/legal/privacy`} className="hover:text-blue-400 transition-colors">{dict.footer?.privacyLink || "Privacidad"}</Link></li>
                    <li><Link href={`/${locale}/legal/terms`} className="hover:text-blue-400 transition-colors">{dict.footer?.termsLink || "Términos"}</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">{dict.footer?.contact || "Contacto"}</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      <Mail size={14} className="text-blue-500 shrink-0" />
                      <span className="truncate text-gray-200 font-medium">info@clicksandgo.com</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold tracking-wide text-gray-300">{dict.features?.audit || "Precios verificados"}</span>
                    </li>
                    <li className="flex space-x-4 pt-3">
                      <Link href="#" aria-label="Comunidad" className="text-gray-400 hover:text-white transition-colors"><MessageSquare size={18} /></Link>
                      <Link href="#" aria-label="Negocios" className="text-gray-400 hover:text-white transition-colors"><Briefcase size={18} /></Link>
                      <Link href="#" aria-label="Desarrollo" className="text-gray-400 hover:text-white transition-colors"><Code2 size={18} /></Link>
                    </li>
                  </ul>
                </div>

              </div>

              {/* ⚖️ Divulgación de afiliados — visible en todas las páginas (FTC / RGPD) */}
              <div className="border-t border-gray-900 pt-6 pb-2">
                <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
                  {dict.footer?.affiliateDisclosure}
                </p>
              </div>

              <div className="border-t border-gray-900 mt-6 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
                <p>{dict.footer?.copyright || "© 2026 Clicks & Go. All rights reserved."}</p>
                <div className="flex space-x-6">
                  <Link href={`/${locale}/legal/privacy`} className="hover:text-white transition-colors">{dict.footer?.privacyLink || "Privacy"}</Link>
                  <Link href={`/${locale}/legal/terms`} className="hover:text-white transition-colors">{dict.footer?.termsLink || "Terms"}</Link>
                  <Link href={`/${locale}/legal/cookies`} className="hover:text-white transition-colors">{dict.footer?.cookiesLink || "Cookies"}</Link>
                </div>
              </div>

            </div>
          </footer>

        </ThemeProvider>
      </body>
    </html>
  );
}
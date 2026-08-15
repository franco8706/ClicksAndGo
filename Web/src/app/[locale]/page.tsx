import React from "react";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CheckCircle, Tag, ShieldCheck, Star } from "lucide-react";
import { auth } from "@/auth";
import { getProfile, getFavoriteIds, toggleFavorite } from "@/lib/railsApi";
import type { Laptop, HardwareNews } from "@/types/laptop";
import type { Dict } from "@/types/dictionary";

import HeroSection from "@/components/HeroSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import CatalogSection from "@/components/CatalogSection";
import CategoryNav, { type CategoryNode } from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import AIDealsSection from "@/components/AIDealsSection";
import PromoBanners from "@/components/PromoBanners";
import EventBanner from "@/components/EventBanner";
import ForYouRail from "@/components/ForYouRail";
import Reveal from "@/components/Reveal";

import { COUNTRY_COOKIE, isSupportedCountry } from "@/lib/countries";

import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";
import itDict from "@/dictionaries/it.json";

/** ⏱️ Techo de espera a Rails. Más allá de esto se degrada en vez de colgar. */
const RAILS_TIMEOUT_MS = 8_000;

// ── Why trust us ─────────────────────────────────────────────────────────────
// (StatsBanner eliminado: quedó como código muerto cuando se dejó de renderizar
//  en el reordenamiento UI v2 — recuperable desde git si se quiere reincorporar.)
function WhyTrustUs({ dict }: { dict: Dict }) {
  const items = [
    {
      icon:  <CheckCircle size={22} className="text-emerald-400" />,
      title: dict.features?.audit     || "Precios revisados a diario",
      desc:  dict.features?.auditDesc || "Actualizamos los precios todos los días desde las tiendas oficiales.",
    },
    {
      icon:  <Tag size={22} className="text-blue-400" />,
      title: dict.features?.finance     || "Buscamos el mejor precio",
      desc:  dict.features?.financeDesc || "Nos conectamos con las tiendas para mostrarte las mejores ofertas que encontramos.",
    },
    {
      icon:  <ShieldCheck size={22} className="text-indigo-400" />,
      title: dict.features?.security     || "Solo tiendas confiables",
      desc:  dict.features?.securityDesc || "Solo distribuidores y tiendas oficiales verificadas.",
    },
    {
      icon:  <Star size={22} className="text-amber-400" />,
      title: dict.features?.curation     || "Selección para vos",
      desc:  dict.features?.curationDesc || "Filtramos miles de laptops para mostrarte solo las que valen.",
    },
  ];

  return (
    <section className="py-20 border-b border-[#e6e8ec]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest">
            {dict.features?.eyebrow || "Nuestra promesa"}
          </span>
          <h2 className="text-5xl sm:text-6xl font-bold text-[#0a0e14] mt-3 tracking-tight">
            {dict.features?.title || "¿Por qué confiar en Clicks & Go?"}
          </h2>
          <p className="text-[#6b7280] mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            {dict.features?.subtitle || "Trabajamos para que no tengas que comparar precios tú mismo"}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group p-7 rounded bg-[#f5f6f8] border border-[#e6e8ec] hover:border-[#d3d7dd] hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <div className="w-11 h-11 rounded bg-white border border-[#e6e8ec] flex items-center justify-center mb-5 group-hover:border-blue-200 group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-200">
                {icon}
              </div>
              <h3 className="text-[#0a0e14] font-semibold text-sm mb-2">{title}</h3>
              <p className="text-[#6b7280] text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { locale } = await params;
  // 📂 Filtro y página vienen de la URL, no del estado del cliente. Con 2.600+
  // productos el servidor manda UNA página, así que filtrar en memoria dejaría
  // fuera casi todo el catálogo. Además así cada subcategoría es una URL
  // propia: compartible, marcable y rastreable por Google.
  const sp = await searchParams;
  const tipoActivo = (sp?.type || "").trim() || null;
  const paginaActual = Math.max(1, Number.parseInt(sp?.page || "1", 10) || 1);
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : locale === "it" ? itDict : esDict;

  const headersList = await headers();
  const ipCountry = headersList.get("x-country-code") || "US";

  // 🌎 Elección explícita del visitante vía `CountrySelector` (cookie), leída
  // ANTES del perfil a propósito: `x-country-code` depende de
  // `x-vercel-ip-country`/`cf-ipcountry`, cabeceras que solo inyectan Vercel o
  // Cloudflare. Este sitio corre en Cloud Run detrás de Google Frontend, sin
  // ninguno de los dos por delante — la cabecera nunca llega y `ipCountry`
  // vale "US" para el 100% de los visitantes, sea cual sea su ubicación real.
  // Verificado en producción (2026-08-11): sin la cabecera, el catálogo
  // mostraba 3 menciones de "Lenovo"; simulándola con `cf-ipcountry: AR` por
  // curl, 274. La cookie es hoy la única señal de país que funciona de verdad
  // para un visitante anónimo.
  const cookieStore = await cookies();
  const cookieCountryRaw = cookieStore.get(COUNTRY_COOKIE)?.value?.toUpperCase();
  const cookieCountry = isSupportedCountry(cookieCountryRaw) ? cookieCountryRaw : null;

  /* ── 👤 Sesión + personalización geo ──────────────────────────────
     Prioridad: perfil de cuenta (la más deliberada y persistente) >
     cookie del selector (elección explícita de esta sesión/dispositivo) >
     IP (hoy siempre "US" — ver nota arriba, se deja como último resorte
     por si el sitio alguna vez queda detrás de un edge con geo real).
     Visitante anónimo sin cookie: catálogo por IP, cero llamadas a Rails
     de perfil. Todo pasa por Rails REST (Postgres es su frontera exclusiva,
     Next.js nunca lo toca directo salvo el adapter de NextAuth). ── */
  const session = await auth().catch(() => null);
  let favoriteIds: string[] = [];
  let preferredCountry: string | null = null;

  if (session?.user?.id) {
    const [profile, favs] = await Promise.all([
      getProfile(session.user.id),
      getFavoriteIds(session.user.id),
    ]);
    preferredCountry = profile?.country_code || null;
    favoriteIds = favs;
  }

  const countryCode = preferredCountry || cookieCountry || ipCountry;
  const isLoggedIn = !!session?.user?.id;

  /* ── Server Action: toggle de favorito desde el catálogo ── */
  async function toggleFavoriteAction(laptopId: string): Promise<void> {
    "use server";
    const sess = await auth().catch(() => null);
    if (!sess?.user?.id) redirect(`/${locale}/login`);
    await toggleFavorite(sess.user.id, laptopId);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/panel`);
  }

  const railsApiUrl  = process.env.RAILS_API_URL || "http://rails_backend:3000";
  const fetchConfig  = {
    next: { revalidate: 60, tags: [`catalog-${countryCode}`] },
    // ⏱️ Sin timeout, si Rails se cuelga el render del home se queda esperando
    // hasta el límite de request de Cloud Run (minutos) y el visitante ve una
    // pestaña en blanco. Con timeout la página sale degradada pero sale.
    signal: AbortSignal.timeout(RAILS_TIMEOUT_MS),
  };

  const PER_PAGE = 40;
  const filtro = tipoActivo ? `&type=${encodeURIComponent(tipoActivo)}` : "";

  const [laptopsRes, newsRes, catsRes] = await Promise.allSettled([
    fetch(
      `${railsApiUrl}/api/v1/notebooks?country=${countryCode}&page=${paginaActual}&per_page=${PER_PAGE}${filtro}`,
      fetchConfig,
    ),
    fetch(`${railsApiUrl}/api/v1/notebooks/hardware_news?country=${countryCode}`, fetchConfig),
    // El árbol va en el mismo Promise.allSettled: si Rails lo falla, la página
    // sale sin menú de categorías en vez de no salir.
    fetch(`${railsApiUrl}/api/v1/products/categories?country=${countryCode}`, fetchConfig),
  ]);

  let laptops: Laptop[] = [];
  if (laptopsRes.status === "fulfilled" && laptopsRes.value.ok) {
    try { laptops = await laptopsRes.value.json(); } catch (e) { console.error("Laptops parse error:", e); }
  }

  let categoryTree: CategoryNode[] = [];
  if (catsRes.status === "fulfilled" && catsRes.value.ok) {
    try { categoryTree = await catsRes.value.json(); } catch (e) { console.error("Categories parse error:", e); }
  }

  // Página llena ⇒ probablemente hay otra. No se pide el total a propósito:
  // un COUNT(*) sobre el catálogo entero cuesta más que la propia página.
  const hayPaginaSiguiente = laptops.length === PER_PAGE;

  // Fallback al catálogo US si la región local viene vacía.
  // ⚠️ Va en try/catch a propósito: antes era un `await fetch` desnudo, así que
  // un Rails caído hacía **500 el home entero para todo visitante no-US** — el
  // único camino sin red de contención de la página (los dos fetch de arriba sí
  // usan Promise.allSettled). Un catálogo vacío es degradación; un 500 no.
  if (laptops.length === 0 && countryCode !== "US") {
    try {
      const fb = await fetch(`${railsApiUrl}/api/v1/notebooks?country=US&limit=40`, fetchConfig);
      if (fb.ok) laptops = await fb.json();
    } catch (e) {
      console.error("Fallback US catalog error:", e);
    }
  }

  let news: HardwareNews[] = [];
  if (newsRes.status === "fulfilled" && newsRes.value.ok) {
    try { news = await newsRes.value.json(); } catch (e) { console.error("News parse error:", e); }
  }

  return (
    <main className="min-h-screen pb-0 font-sans relative overflow-hidden bg-white">
      {/* Tintes de ambiente muy sutiles sobre blanco */}
      {/* `orb-drift` los hace derivar muy lento (18s) y en fases distintas:
          la página respira sin que nada llame la atención. Se apaga con
          prefers-reduced-motion (ver la utilidad en globals.css). */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none z-0 orb-drift" />
      <div
        className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-indigo-500/4 rounded-full blur-[120px] pointer-events-none z-0 orb-drift"
        style={{ animationDelay: "-9s" }}
      />

      {/* 1. Hero + ticker de noticias integrado */}
      <HeroSection dict={dict} news={news} />

      {/* 1b. Cartel de evento comercial (Hot Sale/CyberMonday…) — solo
          aparece si el agente de mercado marcó productos en promoción. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-10">
        <EventBanner laptops={laptops} dict={dict} />
      </section>

      {/* 2. Why trust us */}
      <div className="relative z-10">
        <Reveal>
          <WhyTrustUs dict={dict} />
        </Reveal>
      </div>

      {/* 3. Escaparate de categorías (acceso rápido estilo MercadoLibre) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 py-16">
        <Reveal>
          <CategoryShowcase laptops={laptops} dict={dict} />
        </Reveal>
      </section>

      {/* 3b. Rail personalizado por actividad local del visitante —
          invisible para visitantes nuevos (sin historial). */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pb-10">
        <ForYouRail laptops={laptops} dict={dict} />
      </section>

      {/* 4. Laptop catalog with filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div id="productos" className="mt-6 mb-8 scroll-mt-28">
          {/* Badge live — reemplaza el header del catálogo */}
          <div className="mb-6 flex items-center gap-3 px-5 py-2.5 rounded bg-emerald-50 border border-emerald-200 select-none w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              {dict.hero?.verifiedDeals || "Precios revisados a diario"}
            </span>
          </div>

          {/* 📂 Navegación de dos niveles con conteos reales del backend.
              Antes el catálogo solo mostraba los primeros 40 productos del
              país y no había forma de llegar al resto: con 2.600+ productos
              eso dejaba el 98% inalcanzable, sin URL y sin indexar. */}
          <CategoryNav
            tree={categoryTree}
            activeType={tipoActivo}
            basePath={`/${locale}`}
            dict={dict}
          />

          <CatalogSection
            laptops={laptops}
            countryCode={countryCode}
            dict={dict}
            locale={locale}
            favoriteIds={isLoggedIn ? favoriteIds : undefined}
            toggleFavoriteAction={toggleFavoriteAction}
          />

          <Pagination
            page={paginaActual}
            hasNext={hayPaginaSiguiente}
            basePath={`/${locale}`}
            activeType={tipoActivo}
            dict={dict}
          />
        </div>
      </section>

      {/* 5. Banners promocionales por familia (patrón MercadoLibre) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pb-14 pt-4">
        <Reveal>
          <PromoBanners laptops={laptops} dict={dict} />
        </Reveal>
      </section>

      {/* 6. Mejores Ofertas — accesible desde el navbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 py-16 border-t border-[#e6e8ec]">
        <div id="ofertas" className="scroll-mt-28">
          <Reveal>
            <AIDealsSection laptops={laptops} countryCode={countryCode} dict={dict} />
          </Reveal>
        </div>
      </section>

    </main>
  );
}

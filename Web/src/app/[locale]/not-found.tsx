/**
 * 404 con locale.
 *
 * Antes no existía: `notFound()` de la página de detalle (producto con slug
 * inexistente — o un slug viejo que Google todavía tiene indexado) caía en la
 * pantalla genérica de Next, en inglés y sin camino de vuelta al catálogo.
 * Con más de 16.000 URLs en el sitemap, los 404 por producto retirado son inevitables:
 * conviene que devuelvan al catálogo en vez de ser un callejón sin salida.
 */

import React from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { SearchX, Home } from "lucide-react";

const COPY = {
  es: {
    title: "No encontramos esta página",
    body: "El producto puede haber salido del catálogo o el enlace estar mal escrito.",
    cta: "Ver el catálogo",
  },
  en: {
    title: "We couldn't find this page",
    body: "The product may have left the catalog, or the link may be misspelled.",
    cta: "Browse the catalog",
  },
  pt: {
    title: "Não encontramos esta página",
    body: "O produto pode ter saído do catálogo ou o link estar incorreto.",
    cta: "Ver o catálogo",
  },
  it: {
    title: "Pagina non trovata",
    body: "Il prodotto potrebbe essere uscito dal catalogo o il link non è corretto.",
    cta: "Vedi il catalogo",
  },
} as const;

type CopyLocale = keyof typeof COPY;

export default async function LocaleNotFound() {
  /* 🌍 El idioma sale de `x-locale`, la cabecera que el proxy YA inyecta en
     cada request (ver `proxy.ts`).

     Antes esto era `const t = COPY.es` con la nota "este boundary no recibe
     `params`". Es cierto que no los recibe, pero la conclusión estaba
     equivocada: las traducciones de en/pt/it existían y NUNCA se usaban, así
     que un brasileño que caía en un 404 leía "No encontramos esta página" en
     español. Y los 404 no son raros acá — un producto retirado del catálogo
     deja su URL viva en el índice de Google.

     `headers()` sí está disponible en un Server Component, y el locale ya
     viaja ahí resuelto: es el mismo valor con el que se renderizó el resto
     del sitio, así que no hay riesgo de desincronización. */
  const locale = (await headers()).get("x-locale") ?? "es";
  const t = COPY[locale as CopyLocale] ?? COPY.es;

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6 font-sans">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded bg-[#f5f6f8] border border-[#e6e8ec] flex items-center justify-center mx-auto mb-7">
          <SearchX size={24} className="text-[#9aa1ac]" />
        </div>

        <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-3">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#0a0e14] tracking-tight mb-4">
          {t.title}
        </h1>
        <p className="text-[#6b7280] text-sm leading-relaxed mb-9">{t.body}</p>

        <Link
          href={`/${locale}`}
          className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[2px] text-white font-bold text-sm"
        >
          <Home size={16} />
          {t.cta}
        </Link>
      </div>
    </main>
  );
}

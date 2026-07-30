"use client";

/**
 * Error boundary de las páginas con locale.
 *
 * Antes NO existía ningún `error.tsx`: cualquier excepción no atrapada en un
 * Server Component mostraba la pantalla de error por defecto de Next —
 * en inglés, sin marca y sin salida— a un visitante que puede estar en
 * cualquiera de los 4 idiomas. Para un sitio que opera a nivel mundial, esa
 * pantalla ES la cara del sitio en el peor momento.
 *
 * No usa los diccionarios: si el fallo viene de cargar/leer el diccionario,
 * importarlo acá haría fallar también al boundary. El texto va inline en los
 * 4 idiomas, resuelto por el locale de la URL.
 */

import React from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

const COPY = {
  es: {
    title: "Algo salió mal",
    body: "No pudimos cargar esta página. Suele ser temporal — volvé a intentar en unos segundos.",
    retry: "Reintentar",
    home: "Ir al inicio",
  },
  en: {
    title: "Something went wrong",
    body: "We couldn't load this page. This is usually temporary — try again in a few seconds.",
    retry: "Try again",
    home: "Go to homepage",
  },
  pt: {
    title: "Algo deu errado",
    body: "Não conseguimos carregar esta página. Normalmente é temporário — tente novamente em alguns segundos.",
    retry: "Tentar de novo",
    home: "Ir para o início",
  },
  it: {
    title: "Qualcosa è andato storto",
    body: "Non è stato possibile caricare questa pagina. Di solito è temporaneo — riprova tra qualche secondo.",
    retry: "Riprova",
    home: "Vai alla home",
  },
} as const;

type Locale = keyof typeof COPY;

export default function LocaleError({ reset }: { readonly reset: () => void }) {
  // El locale se lee de la URL en el cliente: `params` no llega a un boundary.
  const segment = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "es";
  const locale = (segment in COPY ? segment : "es") as Locale;
  const t = COPY[locale];

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6 font-sans">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded bg-[#f5f6f8] border border-[#e6e8ec] flex items-center justify-center mx-auto mb-7">
          <AlertTriangle size={24} className="text-amber-500" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#0a0e14] tracking-tight mb-4">
          {t.title}
        </h1>
        <p className="text-[#6b7280] text-sm leading-relaxed mb-9">{t.body}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[2px] text-white font-bold text-sm"
          >
            <RefreshCw size={16} />
            {t.retry}
          </button>
          <a
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[2px] border border-[#e6e8ec] text-[#0a0e14] font-bold text-sm hover:bg-[#f5f6f8] transition-colors"
          >
            <Home size={16} />
            {t.home}
          </a>
        </div>
      </div>
    </main>
  );
}

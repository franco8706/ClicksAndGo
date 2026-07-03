import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLegalPage, LEGAL_SLUGS } from "@/lib/legalContent";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  const locales = ["es", "en", "pt"];
  return locales.flatMap((locale) =>
    LEGAL_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getLegalPage(slug, locale);
  if (!page) return {};
  return {
    title: `${page.title} | Clicks & Go`,
    description: page.intro,
  };
}

export default async function LegalPage({ params }: Props) {
  const { locale, slug } = await params;
  const page = getLegalPage(slug, locale);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-[#090d16] font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-24">
        <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">
          Clicks &amp; Go
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 tracking-tight">
          {page.title}
        </h1>
        <p className="text-gray-400 text-xs mt-3 uppercase tracking-wider font-bold">
          {locale === "en" ? "Last updated" : locale === "pt" ? "Última atualização" : "Última actualización"}: {page.updated}
        </p>

        <p className="text-gray-200 text-base leading-relaxed mt-8">{page.intro}</p>

        <div className="mt-10 space-y-10">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-black text-white mb-3 tracking-tight">{s.h}</h2>
              <div className="space-y-3">
                {s.p.map((text, i) => (
                  <p key={i} className="text-gray-300 text-sm leading-relaxed">
                    {text}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

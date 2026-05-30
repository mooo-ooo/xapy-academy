import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { listGlossaryEntries } from "@/lib/data/glossary";
import { JsonLd } from "@/components/seo/json-ld";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildGraph,
  buildWebPageJsonLd,
  jsonLdScript,
  withXDefault,
} from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { effective, site } = await resolveLocaleForRequest(locale);
  const t = await getTranslations({ locale: effective, namespace: "glossary" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: absoluteUrl(`/${effective}/academy/glossary`),
      languages: withXDefault(
        Object.fromEntries(
          site.supportedLocales.map((l) => [
            l,
            absoluteUrl(`/${l}/academy/glossary`),
          ]),
        ),
        site.publicLocale,
      ),
    },
    openGraph: {
      type: "website",
      locale: effective,
      title: t("title"),
      description: t("subtitle"),
    },
  };
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { effective } = await resolveLocaleForRequest(locale);
  const entries = listGlossaryEntries(effective);
  const t = await getTranslations({
    locale: effective,
    namespace: "glossary",
  });

  const glossaryPath = `/${effective}/academy/glossary`;
  const glossaryAbs = absoluteUrl(glossaryPath);
  // DefinedTermSet schema — one DefinedTerm per entry, all under one
  // pillar set so AI agents can ingest them as a coherent glossary.
  const definedTermSet = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${glossaryAbs}#definedtermset`,
    name: `${t("title")} — Kiyotaka Academy`,
    inLanguage: effective,
    url: glossaryAbs,
    hasDefinedTerm: entries.map((e) => ({
      "@type": "DefinedTerm",
      "@id": absoluteUrl(`/${effective}/academy/glossary#${e.slug}`),
      name: e.term,
      description: e.short,
      alternateName: e.aliases,
      inDefinedTermSet: absoluteUrl(`/${effective}/academy/glossary`),
      url: absoluteUrl(`/${effective}/academy/glossary#${e.slug}`),
      inLanguage: effective,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: "Academy", url: `/${effective}/academy` },
      { name: t("title"), url: glossaryPath },
    ],
    { id: `${glossaryAbs}#breadcrumb` },
  );
  const webPageJsonLd = buildWebPageJsonLd({
    url: glossaryPath,
    name: t("title"),
    description: t("subtitle"),
    inLanguage: effective,
    hasBreadcrumb: true,
  });

  // Build an alphabetical index of letters present in this locale.
  const letters = Array.from(
    new Set(entries.map((e) => e.term.charAt(0).toLocaleUpperCase(effective))),
  ).sort();

  return (
    <div>
      <JsonLd
        data={buildGraph([webPageJsonLd, definedTermSet, breadcrumbJsonLd])}
      />

      <header className="mx-auto w-full max-w-3xl px-6 pt-16 pb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          Academy
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
          {t("subtitle")}
        </p>

        {letters.length > 0 && (
          <nav
            aria-label={t("index")}
            className="mt-8 flex flex-wrap gap-2 border-t border-[hsl(var(--border))] pt-4"
          >
            {letters.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]"
              >
                {l}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        {letters.map((letter) => {
          const lettersInSection = entries.filter(
            (e) => e.term.charAt(0).toLocaleUpperCase(effective) === letter,
          );
          return (
            <div key={letter} className="mb-12">
              <h2
                id={`letter-${letter}`}
                className="mb-4 text-3xl font-bold text-[hsl(var(--foreground))]"
              >
                {letter}
              </h2>
              <dl className="space-y-6">
                {lettersInSection.map((e) => (
                  <div
                    key={e.slug}
                    id={e.slug}
                    className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 scroll-mt-24"
                  >
                    <dt className="flex flex-wrap items-baseline gap-3">
                      <span className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                        {e.term}
                      </span>
                      {e.aliases && e.aliases.length > 0 && (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {e.aliases.join(" · ")}
                        </span>
                      )}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-[hsl(var(--foreground))]">
                      {e.short}
                    </dd>
                    <dd className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {e.long}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </section>
    </div>
  );
}

// Satisfy unused-import lint while still allowing future use of helpers.
void jsonLdScript;
void routing;

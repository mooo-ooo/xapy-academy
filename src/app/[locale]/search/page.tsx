import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { searchPublishedArticlesPage } from "@/lib/data/search";
import { InfiniteSearchGrid } from "@/components/academy/infinite-search-grid";
import { SearchSection } from "@/components/academy/search-section";
import { listTrendingTags } from "@/lib/data/tags";
import type { Locale } from "@/i18n/routing";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return {
    title: t("title"),
    robots: { index: false }, // search result pages shouldn't be indexed
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const { effective } = await resolveLocaleForRequest(locale);

  const [page, trending, t] = await Promise.all([
    query
      ? searchPublishedArticlesPage(query, effective, { limit: 12 })
      : Promise.resolve({ hits: [], nextOffset: null }),
    listTrendingTags(effective, 6),
    getTranslations({ locale: effective, namespace: "search" }),
  ]);
  const hits = page.hits;

  const trendingPills =
    trending.length > 0
      ? trending
      : [
          { slug: "delta", name: "DELTA" },
          { slug: "vwap", name: "VWAP" },
          { slug: "liquidity", name: "LIQUIDITY" },
        ];

  return (
    <div className="pt-[110px] pb-24">
      <div className="mx-auto w-full max-w-[1280px] px-6">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
            <Search size={12} className="mr-1 inline" />
            {t("title")}
          </p>
          {query ? (
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {t("resultsFor", { query })}
            </h1>
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {t("placeholderHeading")}
            </h1>
          )}
        </header>

        <div className="mb-10">
          <SearchSection trending={trendingPills} initialQuery={query} />
        </div>

        {!query ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("typeToBegin")}
          </p>
        ) : hits.length === 0 ? (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {t("noResults", { query })}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
              {t("count", { count: hits.length })}
            </p>
            <InfiniteSearchGrid
              initialHits={hits}
              initialOffset={page.nextOffset}
              query={query}
              locale={effective as Locale}
            />
          </>
        )}
      </div>
    </div>
  );
}

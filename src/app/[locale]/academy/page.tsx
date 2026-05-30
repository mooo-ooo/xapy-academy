import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Hero } from "@/components/academy/hero";
import { SearchSection } from "@/components/academy/search-section";
import { ModuleNav } from "@/components/academy/module-nav";
import { ArticleCardSkeletonGrid } from "@/components/academy/article-card-skeleton";
import { InfiniteArticleGrid } from "@/components/academy/infinite-article-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { listPublicModules } from "@/lib/data/modules";
import { listLatestArticlesPage } from "@/lib/data/articles";
import { listTrendingTags } from "@/lib/data/tags";
import { getSiteSetting } from "@/lib/data/site";
import { buildGraph, buildWebPageJsonLd } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const revalidate = 60;

/**
 * Latest-articles grid — initial 12 server-rendered for SEO + fast
 * first paint, subsequent batches loaded via `/api/feed` when the
 * sentinel enters the viewport (mirrors kiyotaka.ai's cursor infinite
 * scroll, 12 items per batch).
 */
async function LatestGrid({ locale }: { locale: Locale }) {
  const [page, t] = await Promise.all([
    listLatestArticlesPage(locale, { limit: 12 }),
    getTranslations({ locale, namespace: "academy" }),
  ]);
  if (page.items.length === 0) {
    return (
      <p className="col-span-full text-center text-sm text-[hsl(var(--muted-foreground))]">
        {t("module.empty")}
      </p>
    );
  }
  return (
    <InfiniteArticleGrid
      type="latest"
      locale={locale}
      initialItems={page.items}
      initialCursor={page.nextCursor}
    />
  );
}

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { effective } = await resolveLocaleForRequest(locale);
  const [modules, trending, t, site] = await Promise.all([
    listPublicModules(effective),
    listTrendingTags(effective, 6),
    getTranslations({ locale: effective, namespace: "academy" }),
    getSiteSetting(),
  ]);

  // CollectionPage + ItemList of the module pillars — a content-hierarchy
  // map for AI fan-out (GEO). The Organization/WebSite live in the layout
  // graph; this references the WebSite by @id.
  const landingJsonLd = buildWebPageJsonLd({
    url: `/${effective}/academy`,
    name: site.siteName,
    description: site.defaultMetaDescription ?? site.tagline ?? undefined,
    inLanguage: effective,
    collection: modules.map((m) => ({
      url: `/${effective}/academy/${m.slug}`,
      name: m.name,
    })),
  });

  const trendingPills =
    trending.length > 0
      ? trending
      : [
          { slug: "delta", name: "DELTA" },
          { slug: "vwap", name: "VWAP" },
          { slug: "liquidity", name: "LIQUIDITY" },
        ];

  return (
    <>
      <JsonLd data={buildGraph([landingJsonLd])} />
      <Hero />
      <div className="-mt-4 px-6">
        <SearchSection trending={trendingPills} />
      </div>

      <section className="mt-12">
        <ModuleNav
          modules={modules}
          labels={{ all: t("modules.all"), viewAll: t("modules.viewAll") }}
        />
      </section>

      <section className="mx-auto mt-8 w-full max-w-[1280px] px-6 pb-24">
        <Suspense fallback={<ArticleCardSkeletonGrid count={8} />}>
          <LatestGrid locale={effective} />
        </Suspense>
      </section>
    </>
  );
}

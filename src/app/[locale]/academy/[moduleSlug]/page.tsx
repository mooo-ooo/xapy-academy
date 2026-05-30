import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ModuleNav } from "@/components/academy/module-nav";
import { ArticleCardSkeleton } from "@/components/academy/article-card-skeleton";
import { InfiniteArticleGrid } from "@/components/academy/infinite-article-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { getPublicModule, listPublicModules } from "@/lib/data/modules";
import {
  listPublishedArticlesInModule,
  listPublishedArticlesInModulePage,
} from "@/lib/data/articles";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildGraph,
  buildLearningResourceJsonLd,
  buildWebPageJsonLd,
  withXDefault,
} from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const revalidate = 60;

type RouteParams = { locale: string; moduleSlug: string };

/** Module article grid — initial 12 server-rendered + cursor infinite
 *  scroll for the rest, same shape as the landing page. */
async function ModuleArticles({
  moduleId,
  locale,
}: {
  moduleId: string;
  moduleSlug: string;
  locale: Locale;
}) {
  const [page, t] = await Promise.all([
    listPublishedArticlesInModulePage(moduleId, locale, { limit: 12 }),
    getTranslations({ locale, namespace: "academy" }),
  ]);
  if (page.items.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {t("module.empty")}
      </p>
    );
  }
  return (
    <InfiniteArticleGrid
      type="module"
      moduleId={moduleId}
      locale={locale}
      initialItems={page.items}
      initialCursor={page.nextCursor}
      gridClassName="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
    />
  );
}

function ModuleArticlesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, moduleSlug } = await params;
  const { effective, site } = await resolveLocaleForRequest(locale);
  const mod = await getPublicModule(moduleSlug, effective);
  if (!mod) return {};
  const title =
    mod.translation?.metaTitle ?? mod.translation?.name ?? mod.slug;
  const description = mod.translation?.metaDescription ?? undefined;
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/${effective}/academy/${mod.slug}`),
      languages: withXDefault(
        Object.fromEntries(
          site.supportedLocales.map((l) => [
            l,
            absoluteUrl(`/${l}/academy/${mod.slug}`),
          ]),
        ),
        site.publicLocale,
      ),
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: effective,
      url: absoluteUrl(`/${effective}/academy/${mod.slug}`),
    },
  };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, moduleSlug } = await params;
  setRequestLocale(locale);

  const { effective } = await resolveLocaleForRequest(locale);
  const [mod, modules, t] = await Promise.all([
    getPublicModule(moduleSlug, effective),
    listPublicModules(effective),
    getTranslations({ locale: effective, namespace: "academy" }),
  ]);
  if (!mod) notFound();

  const moduleArticles = await listPublishedArticlesInModule(mod.id, effective);
  const modulePath = `/${effective}/academy/${mod.slug}`;
  const moduleAbs = absoluteUrl(modulePath);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("breadcrumb.academy"), url: `/${effective}/academy` },
      { name: mod.translation?.name ?? mod.slug, url: modulePath },
    ],
    { id: `${moduleAbs}#breadcrumb` },
  );
  const learningJsonLd = buildLearningResourceJsonLd({
    name: mod.translation?.name ?? mod.slug,
    description: mod.translation?.description ?? null,
    url: modulePath,
    inLanguage: effective,
    teaches: [mod.slug.replace(/-/g, " ")],
  });
  const webPageJsonLd = buildWebPageJsonLd({
    url: modulePath,
    name: mod.translation?.metaTitle ?? mod.translation?.name ?? mod.slug,
    description: mod.translation?.description ?? null,
    inLanguage: effective,
    hasBreadcrumb: true,
    collection: moduleArticles.slice(0, 50).map((a) => ({
      url: `/${effective}/academy/${mod.slug}/${a.slug}`,
      name: a.title,
    })),
  });

  return (
    <div>
      <JsonLd
        data={buildGraph([webPageJsonLd, learningJsonLd, breadcrumbJsonLd])}
      />
      <header className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          {t("breadcrumb.academy")}
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          {mod.translation?.name ?? mod.slug}
        </h1>
        {mod.translation?.description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
            {mod.translation.description}
          </p>
        )}
      </header>

      <ModuleNav
        modules={modules}
        activeSlug={mod.slug}
        labels={{ all: t("modules.all"), viewAll: t("modules.viewAll") }}
      />

      <section className="mx-auto mt-10 w-full max-w-[1280px] px-6 pb-24">
        <Suspense fallback={<ModuleArticlesSkeleton />}>
          <ModuleArticles
            moduleId={mod.id}
            moduleSlug={mod.slug}
            locale={effective}
          />
        </Suspense>
      </section>
    </div>
  );
}

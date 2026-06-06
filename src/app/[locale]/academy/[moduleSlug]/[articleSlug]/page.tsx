import { notFound, redirect as nextRedirect } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { ModuleArticleNav } from "@/components/academy/module-article-nav";
import { AuthorBar } from "@/components/academy/author-bar";
import { CategoryPill } from "@/components/academy/category-pill";
import { LikeButton } from "@/components/academy/like-button";
import { ShareButton } from "@/components/academy/share-button";
import { TocSidebar } from "@/components/academy/toc-sidebar";
import { JsonLd } from "@/components/seo/json-ld";
import { auth } from "@/lib/auth";
import { hasUserLikedArticle } from "@/lib/data/likes";
import { absoluteUrl as makeAbsoluteUrl } from "@/lib/seo";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import {
  loadArticleForReading,
  listModuleArticleNav,
} from "@/lib/data/articles";
import { listGlossaryEntries } from "@/lib/data/glossary";
import { ViewTracker } from "@/components/academy/view-tracker";
import { renderArticleHtml } from "@/lib/html";
import { markdownToHtml } from "@/lib/content";
import {
  absoluteUrl,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildGraph,
  buildWebPageJsonLd,
  withXDefault,
} from "@/lib/seo";
import { getSiteSetting } from "@/lib/data/site";

export const revalidate = 60;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type RouteParams = {
  locale: string;
  moduleSlug: string;
  articleSlug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, moduleSlug, articleSlug } = await params;
  const { effective, site } = await resolveLocaleForRequest(locale);
  const article = await loadArticleForReading(
    moduleSlug,
    articleSlug,
    effective,
  );
  if (!article) return {};

  const languages: Record<string, string> = {};
  for (const [lang, slug] of Object.entries(article.alternates)) {
    if (site.supportedLocales.includes(lang as typeof effective)) {
      languages[lang] = absoluteUrl(`/${lang}/academy/${moduleSlug}/${slug}`);
    }
  }

  const title = article.metaTitle ?? article.title;
  const description = article.metaDescription ?? article.excerpt ?? undefined;
  const canonical = absoluteUrl(
    `/${article.renderedLocale}/academy/${moduleSlug}/${article.slug}`,
  );

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: withXDefault(languages, site.publicLocale, canonical),
      // Advertise the clean Markdown mirror to AI agents that send
      // Accept: text/markdown or scan <head> for it.
      types: {
        "text/markdown": absoluteUrl(
          `/api/articles/${article.renderedLocale}/${moduleSlug}/${article.slug}`,
        ),
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      locale: article.renderedLocale,
      url: canonical,
      publishedTime: article.publishedAt?.toISOString(),
      images: article.ogImage ? [{ url: article.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, moduleSlug, articleSlug } = await params;
  setRequestLocale(locale);

  const { effective } = await resolveLocaleForRequest(locale);
  const article = await loadArticleForReading(
    moduleSlug,
    articleSlug,
    effective,
  );
  if (!article) notFound();

  // SEO canonicalization: if the URL slug doesn't match the slug of the
  // translation we ended up rendering, redirect to the canonical one.
  // Prevents two URLs serving the same content (rank dilution).
  if (article.slug !== articleSlug) {
    nextRedirect(
      `/${effective}/academy/${article.moduleSlug}/${article.slug}`,
    );
  }

  // View tracking is mounted as <ViewTracker /> below — runs once on
  // client hydration with localStorage dedup, so refreshes / cached
  // ISR responses / bots don't inflate the counter.

  const articleHtmlSource =
    article.bodyHtml && article.bodyHtml.trim()
      ? article.bodyHtml
      : markdownToHtml(article.bodyMdx);
  const [{ html: bodyHtml, toc }, moduleNav, t, site, session] = await Promise.all([
    renderArticleHtml(articleHtmlSource),
    listModuleArticleNav(article.moduleId, effective),
    getTranslations({ locale: effective, namespace: "academy" }),
    getSiteSetting(),
    auth(),
  ]);
  const initiallyLiked = await hasUserLikedArticle(
    session?.user?.id,
    article.id,
  );

  const articleUrl = `/${article.renderedLocale}/academy/${moduleSlug}/${article.slug}`;
  const authorUrl = article.authorSlug
    ? `/${article.renderedLocale}/authors/${article.authorSlug}`
    : undefined;
  const educationalLevel = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
  }[article.difficulty];

  // Entity-link glossary terms that actually appear in the body (word-bounded,
  // diacritic-aware) → DefinedTerm about/mentions sharing the glossary @ids.
  const glossaryBase = absoluteUrl(
    `/${article.renderedLocale}/academy/glossary`,
  );
  const matchedTerms = listGlossaryEntries(article.renderedLocale).filter((e) =>
    [e.term, ...(e.aliases ?? [])].some((n) => {
      const needle = n.trim();
      if (needle.length < 2) return false;
      return new RegExp(
        `(^|[^\\p{L}])${escapeRegExp(needle)}([^\\p{L}]|$)`,
        "iu",
      ).test(article.bodyMdx);
    }),
  );
  const definedTerms = matchedTerms.slice(0, 10).map((e) => ({
    "@type": "DefinedTerm",
    "@id": `${glossaryBase}#${e.slug}`,
    name: e.term,
    url: `${glossaryBase}#${e.slug}`,
    inDefinedTermSet: `${glossaryBase}#definedtermset`,
  }));

  const articleJsonLd = buildArticleJsonLd({
    headline: article.title,
    description: article.metaDescription ?? article.excerpt,
    url: articleUrl,
    imageUrl: article.ogImage ?? "/opengraph-image",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      name: article.authorName,
      url: authorUrl,
      image: article.authorImage,
      slug: article.authorSlug,
    },
    inLanguage: article.renderedLocale,
    keywords: article.keywords,
    articleSection: article.moduleName,
    wordCount: article.wordCount,
    timeRequiredMinutes: article.readingTimeMinutes,
    educationalLevel,
    about: definedTerms.slice(0, 3),
    mentions: definedTerms,
    modulePath: {
      name: article.moduleName,
      url: `/${article.renderedLocale}/academy/${article.moduleSlug}`,
    },
  });
  const canonicalAbs = absoluteUrl(articleUrl);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("breadcrumb.academy"), url: `/${article.renderedLocale}/academy` },
      {
        name: article.moduleName,
        url: `/${article.renderedLocale}/academy/${article.moduleSlug}`,
      },
      { name: article.title, url: articleUrl },
    ],
    { id: `${canonicalAbs}#breadcrumb` },
  );
  const webPageJsonLd = buildWebPageJsonLd({
    url: articleUrl,
    name: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt,
    inLanguage: article.renderedLocale,
    primaryImageUrl: article.ogImage ?? undefined,
    hasBreadcrumb: true,
  });

  return (
    <article>
      <ViewTracker articleId={article.id} />
      <JsonLd
        data={buildGraph([webPageJsonLd, articleJsonLd, breadcrumbJsonLd])}
      />
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-16 sm:pt-24 lg:pt-32">
        <Link
          href={`/academy`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft size={14} />
          {t("breadcrumb.academy")}
        </Link>

        {/*
         * Three-column layout: [module lessons nav] [body up to 3xl] [256px TOC].
         * Header sits in row 1 (middle column); both side rails sticky-pin.
         */}
        <div
          className="grid grid-cols-1 gap-y-8 lg:grid-cols-[240px_minmax(0,1fr)_256px] lg:items-start lg:gap-x-12 lg:gap-y-12"
          style={
            article.accentColor
              ? ({ "--article-accent": article.accentColor } as React.CSSProperties)
              : undefined
          }
        >
          {/* Row 1 — Header (middle column on lg, full width on mobile) */}
          <header className="w-full max-w-3xl lg:col-start-2 lg:row-start-1">
            <CategoryPill
              moduleSlug={article.moduleSlug}
              moduleName={article.moduleName}
            />

            {/* H1: 60px / 900 / lh 1.1 / tracking -1.5px on desktop;
                clamps down to 36px on mobile. */}
            <h1
              className="mt-6 font-black text-[hsl(var(--foreground))]"
              style={{
                fontSize: "clamp(36px, 6vw, 60px)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
              }}
            >
              {article.title}
            </h1>
            {article.excerpt && (
              <p
                className="mt-6"
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: 24,
                  fontWeight: 300,
                  lineHeight: "38.4px",
                  letterSpacing: "0.6px",
                }}
              >
                {article.excerpt}
              </p>
            )}

            <div className="mt-6">
              <AuthorBar
                name={article.authorName}
                publishedAt={article.publishedAt}
                locale={article.renderedLocale}
                authorSlug={article.authorSlug}
              />
            </div>
          </header>

          {/* Row 2 — left sticky sidebar: module lessons + actions (lg only) */}
          <aside
            className="sticky top-24 hidden max-h-[calc(100vh-7rem)] flex-col gap-6 overflow-y-auto pr-1 lg:flex lg:col-start-1 lg:row-start-2"
            aria-label={article.moduleName}
          >
            {moduleNav.length > 1 && (
              <ModuleArticleNav
                moduleName={article.moduleName}
                moduleSlug={article.moduleSlug}
                items={moduleNav}
                currentSlug={article.slug}
              />
            )}
            <div className="flex items-center gap-3">
              <LikeButton
                articleId={article.id}
                initialCount={article.likeCount}
                initiallyLiked={initiallyLiked}
                isAuthenticated={!!session?.user}
                locale={article.renderedLocale}
              />
              <ShareButton
                title={article.title}
                url={makeAbsoluteUrl(articleUrl)}
              />
            </div>
          </aside>

          {/* Mobile action bar — keeps Like/Share reachable on small screens */}
          <div className="flex items-center gap-3 lg:hidden">
            <LikeButton
              articleId={article.id}
              initialCount={article.likeCount}
              initiallyLiked={initiallyLiked}
              isAuthenticated={!!session?.user}
              locale={article.renderedLocale}
            />
            <ShareButton
              title={article.title}
              url={makeAbsoluteUrl(articleUrl)}
            />
          </div>

          {/* Row 2 — body */}
          <div
            className="prose-academy w-full max-w-3xl lg:col-start-2 lg:row-start-2"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* Row 2 — right TOC (sticky lives on the aside itself) */}
          <TocSidebar
            entries={toc}
            label={t("article.toc")}
            className="lg:col-start-3 lg:row-start-2"
          />
        </div>

      </div>
    </article>
  );
}

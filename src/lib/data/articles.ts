import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";
import {
  computeReadingTimeMinutes,
  countWordsInMdx,
} from "@/lib/reading-time";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
  locale: Locale;
  moduleSlug: string;
  moduleName: string;
  difficulty: Difficulty;
  likeCount: number;
  readingTimeMinutes: number;
  sortOrder: number;
  author: { name: string | null; email: string };
  /** True when the rendered translation locale differs from the
   *  requested locale (e.g. /vi page falling back to an EN-only
   *  article). Card surfaces a small "EN" tag in that case. */
  isFallback: boolean;
};

const ARTICLE_LIST_SELECT = {
  id: true,
  coverImage: true,
  publishedAt: true,
  difficulty: true,
  likeCount: true,
  sortOrder: true,
  sourceLocale: true,
  module: {
    select: {
      slug: true,
      translations: { select: { locale: true, name: true } },
    },
  },
  author: { select: { name: true, email: true } },
  translations: {
    where: { status: "PUBLISHED" as const },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      bodyMdx: true,
      publishedAt: true,
      locale: true,
    },
  },
} as const;

type ArticleListRow = {
  id: string;
  coverImage: string | null;
  publishedAt: Date | null;
  difficulty: Difficulty;
  likeCount: number;
  sortOrder: number;
  sourceLocale: string;
  module: {
    slug: string;
    translations: Array<{ locale: string; name: string }>;
  };
  author: { name: string | null; email: string };
  translations: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    bodyMdx: string;
    publishedAt: Date | null;
    locale: string;
  }>;
};

function moduleNameFor(
  translations: Array<{ locale: string; name: string }>,
  locale: Locale,
): string {
  return (
    translations.find((t) => t.locale === locale)?.name ??
    translations.find((t) => t.locale === "en")?.name ??
    translations[0]?.name ??
    ""
  );
}

/**
 * Pick the translation to render for a list card. Strictly the
 * requested locale — articles are always filtered by the viewer's
 * current language, never falling back to another locale. Returns
 * null when no PUBLISHED translation exists in that locale, so the
 * card is dropped from the list.
 */
function pickListTranslation(
  row: ArticleListRow,
  locale: Locale,
): ArticleListRow["translations"][number] | null {
  return row.translations.find((t) => t.locale === locale) ?? null;
}

function toListItem(row: ArticleListRow, locale: Locale): ArticleListItem | null {
  const tr = pickListTranslation(row, locale);
  if (!tr) return null;
  return {
    id: row.id,
    slug: tr.slug,
    title: tr.title,
    excerpt: tr.excerpt,
    coverImage: row.coverImage,
    publishedAt: tr.publishedAt ?? row.publishedAt,
    locale: tr.locale as Locale,
    moduleSlug: row.module.slug,
    moduleName: moduleNameFor(row.module.translations, locale),
    difficulty: row.difficulty,
    likeCount: row.likeCount,
    readingTimeMinutes: computeReadingTimeMinutes(tr.bodyMdx),
    sortOrder: row.sortOrder,
    author: row.author,
    isFallback: tr.locale !== locale,
  };
}

export const listPublishedArticlesInModule = cache(
  async (moduleId: string, locale: Locale): Promise<ArticleListItem[]> => {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        moduleId,
        translations: { some: { status: "PUBLISHED", locale } },
      },
      select: ARTICLE_LIST_SELECT,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows
      .map((r) => toListItem(r as unknown as ArticleListRow, locale))
      .filter((x): x is ArticleListItem => x !== null);
  },
);

/** Most recent N published articles across all modules (for landing). */
export const listLatestArticles = cache(
  async (locale: Locale, limit = 12): Promise<ArticleListItem[]> => {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        translations: { some: { status: "PUBLISHED", locale } },
      },
      select: ARTICLE_LIST_SELECT,
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
    return rows
      .map((r) => toListItem(r as unknown as ArticleListRow, locale))
      .filter((x): x is ArticleListItem => x !== null);
  },
);

/* ---------------------------------------------------------------
 * Cursor-based pagination (keyset on publishedAt + id) for infinite
 * scroll. Mirrors the live site's `?cursor=&limit=12` shape. The
 * cursor string is `<publishedAt-ms-base36>:<id>` — opaque to the
 * client. Returning `nextCursor: null` signals the feed is exhausted.
 * --------------------------------------------------------------- */
export type ArticleFeedPage = {
  items: ArticleListItem[];
  nextCursor: string | null;
};
type ArticleCursor = { publishedAt: Date; id: string };

function encodeArticleCursor(item: ArticleListItem | null): string | null {
  if (!item) return null;
  const ms = item.publishedAt ? item.publishedAt.getTime() : 0;
  return `${ms.toString(36)}:${item.id}`;
}

function decodeArticleCursor(raw: string | null | undefined): ArticleCursor | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const ms = parseInt(raw.slice(0, idx), 36);
  const id = raw.slice(idx + 1);
  if (!Number.isFinite(ms) || !id) return null;
  return { publishedAt: new Date(ms), id };
}

function cursorWhereClause(c: ArticleCursor | null) {
  if (!c) return {};
  // Keyset: (publishedAt, id) DESC — strict-less by publishedAt OR
  // equal publishedAt with strict-less id. Stable across pages.
  return {
    OR: [
      { publishedAt: { lt: c.publishedAt } },
      { AND: [{ publishedAt: c.publishedAt }, { id: { lt: c.id } }] },
    ],
  };
}

const FEED_ORDER = [{ publishedAt: "desc" as const }, { id: "desc" as const }];

type ModuleCursor = { sortOrder: number; id: string };

function encodeModuleCursor(item: ArticleListItem | null): string | null {
  if (!item) return null;
  return `${item.sortOrder.toString(36)}:${item.id}`;
}

function decodeModuleCursor(raw: string | null | undefined): ModuleCursor | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const sortOrder = parseInt(raw.slice(0, idx), 36);
  const id = raw.slice(idx + 1);
  if (!Number.isFinite(sortOrder) || !id) return null;
  return { sortOrder, id };
}

function moduleCursorWhereClause(c: ModuleCursor | null) {
  if (!c) return {};
  return {
    OR: [
      { sortOrder: { gt: c.sortOrder } },
      { AND: [{ sortOrder: c.sortOrder }, { id: { gt: c.id } }] },
    ],
  };
}

const MODULE_FEED_ORDER = [
  { sortOrder: "asc" as const },
  { id: "asc" as const },
];

export async function listLatestArticlesPage(
  locale: Locale,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<ArticleFeedPage> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12));
  const cursor = decodeArticleCursor(opts.cursor);
  const rows = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      translations: { some: { status: "PUBLISHED", locale } },
      ...cursorWhereClause(cursor),
    },
    select: ARTICLE_LIST_SELECT,
    orderBy: FEED_ORDER,
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items = slice
    .map((r) => toListItem(r as unknown as ArticleListRow, locale))
    .filter((x): x is ArticleListItem => x !== null);
  return {
    items,
    nextCursor: hasMore ? encodeArticleCursor(items[items.length - 1] ?? null) : null,
  };
}

export async function listPublishedArticlesInModulePage(
  moduleId: string,
  locale: Locale,
  opts: { cursor?: string | null; limit?: number; excludeId?: string } = {},
): Promise<ArticleFeedPage> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12));
  const cursor = decodeModuleCursor(opts.cursor);
  const rows = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      moduleId,
      translations: { some: { status: "PUBLISHED", locale } },
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      ...moduleCursorWhereClause(cursor),
    },
    select: ARTICLE_LIST_SELECT,
    orderBy: MODULE_FEED_ORDER,
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items = slice
    .map((r) => toListItem(r as unknown as ArticleListRow, locale))
    .filter((x): x is ArticleListItem => x !== null);
  return {
    items,
    nextCursor: hasMore ? encodeModuleCursor(items[items.length - 1] ?? null) : null,
  };
}

export type LoadedArticle = {
  id: string;
  moduleId: string;
  moduleSlug: string;
  moduleName: string;
  authorId: string;
  authorName: string;
  /** Public author-profile slug, or null when the author has none. */
  authorSlug: string | null;
  /** Author avatar URL (OAuth) for Person.image, or null. */
  authorImage: string | null;
  sourceLocale: Locale;
  /** Locale actually rendered — may differ from requested if fallback. */
  renderedLocale: Locale;
  /** True if the renderedLocale ≠ requestedLocale (display a banner). */
  isFallback: boolean;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMdx: string;
  bodyHtml: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  publishedAt: Date | null;
  /** Real last-edit timestamp of the rendered translation (Article schema dateModified). */
  updatedAt: Date | null;
  coverImage: string | null;
  accentColor: string | null;
  difficulty: Difficulty;
  likeCount: number;
  /** Localized tag names → Article.keywords. */
  keywords: string[];
  /** Reading time of the rendered translation (→ Article.timeRequired). */
  readingTimeMinutes: number;
  /** Word count of the rendered translation (→ Article.wordCount). */
  wordCount: number;
  /** Sibling translations that exist (locale → slug) for hreflang/switcher. */
  alternates: Partial<Record<Locale, string>>;
};

/**
 * Load an article + the best translation for the viewer's locale, falling
 * back to the source locale when needed.
 *
 * Returns null if the slug doesn't match any published translation
 * for either the requested locale OR the fallback source locale.
 */
export const loadArticleForReading = cache(
  async (
    moduleSlug: string,
    articleSlug: string,
    requestedLocale: Locale,
  ): Promise<LoadedArticle | null> => {
    // Step 1 — find the PUBLISHED translation that matches the URL slug
    // IN THE REQUESTED LOCALE. Articles are always filtered by the
    // viewer's language: a slug that only exists in another locale is a
    // miss here, so the page 404s instead of falling back to English.
    const localeMatch = await prisma.articleTranslation.findFirst({
      where: {
        slug: articleSlug,
        locale: requestedLocale,
        status: "PUBLISHED",
        article: { status: "PUBLISHED", module: { slug: moduleSlug } },
      },
      select: { articleId: true },
    });
    if (!localeMatch) return null;

    // Step 2 — load the article with ALL its published translations
    // (siblings still feed the hreflang/alternates + language switcher).
    const article = await prisma.article.findUnique({
      where: { id: localeMatch.articleId },
      include: {
        module: true,
        author: {
          select: { name: true, email: true, slug: true, image: true },
        },
        tags: { include: { tag: { include: { translations: true } } } },
        translations: { where: { status: "PUBLISHED" } },
      },
    });
    if (!article || article.status !== "PUBLISHED") return null;

    // Step 3 — render strictly the requested locale (guaranteed to exist
    // by step 1). No cross-locale fallback.
    const renderedTr =
      article.translations.find((t) => t.locale === requestedLocale) ?? null;
    if (!renderedTr) return null;

    // Step 4 — module display name for breadcrumb.
    const [moduleTr, moduleEn] = await Promise.all([
      prisma.moduleTranslation.findFirst({
        where: { moduleId: article.moduleId, locale: requestedLocale },
      }),
      prisma.moduleTranslation.findFirst({
        where: { moduleId: article.moduleId, locale: "en" },
      }),
    ]);
    const moduleName =
      moduleTr?.name ?? moduleEn?.name ?? article.module.slug;

    const alternates: Partial<Record<Locale, string>> = {};
    for (const sib of article.translations) {
      alternates[sib.locale as Locale] = sib.slug;
    }

    // Localized tag names for the rendered locale (→ Article.keywords),
    // falling back to en then any, then the slug. Deduped, order-stable.
    const keywords = Array.from(
      new Set(
        article.tags.map((at) => {
          const trs = at.tag.translations;
          return (
            trs.find((t) => t.locale === renderedTr.locale)?.name ??
            trs.find((t) => t.locale === requestedLocale)?.name ??
            trs.find((t) => t.locale === "en")?.name ??
            trs[0]?.name ??
            at.tag.slug
          );
        }),
      ),
    );

    return {
      id: article.id,
      moduleId: article.moduleId,
      moduleSlug: article.module.slug,
      moduleName,
      authorId: article.authorId,
      authorName: article.author.name ?? article.author.email.split("@")[0],
      authorSlug: article.author.slug,
      authorImage: article.author.image,
      sourceLocale: article.sourceLocale as Locale,
      renderedLocale: renderedTr.locale as Locale,
      isFallback: renderedTr.locale !== requestedLocale,
      slug: renderedTr.slug,
      title: renderedTr.title,
      excerpt: renderedTr.excerpt,
      bodyMdx: renderedTr.bodyMdx,
      bodyHtml: renderedTr.bodyHtml,
      metaTitle: renderedTr.metaTitle,
      metaDescription: renderedTr.metaDescription,
      ogImage: renderedTr.ogImage,
      publishedAt: renderedTr.publishedAt ?? article.publishedAt,
      updatedAt: renderedTr.updatedAt ?? article.updatedAt,
      coverImage: article.coverImage,
      accentColor: article.accentColor,
      difficulty: article.difficulty,
      likeCount: article.likeCount,
      keywords,
      readingTimeMinutes: computeReadingTimeMinutes(renderedTr.bodyMdx),
      wordCount: countWordsInMdx(renderedTr.bodyMdx),
      alternates,
    };
  },
);

/** Published articles authored by a given user, newest first (author page). */
export const listPublishedArticlesByAuthor = cache(
  async (authorId: string, locale: Locale): Promise<ArticleListItem[]> => {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        authorId,
        translations: { some: { status: "PUBLISHED", locale } },
      },
      select: ARTICLE_LIST_SELECT,
      orderBy: { publishedAt: "desc" },
    });
    return rows
      .map((r) => toListItem(r as unknown as ArticleListRow, locale))
      .filter((x): x is ArticleListItem => x !== null);
  },
);

/** Lightweight sibling nav for the article sidebar: every published article
 *  in the module, oldest-first ("lesson" order. Selects only slug + title for
 *  the resolved locale — no excerpt / cover / counts. */
export const listModuleArticleNav = cache(
  async (
    moduleId: string,
    locale: Locale,
  ): Promise<{ slug: string; title: string }[]> => {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        moduleId,
        translations: { some: { status: "PUBLISHED", locale } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        sourceLocale: true,
        translations: {
          where: { status: "PUBLISHED" },
          select: { locale: true, slug: true, title: true },
        },
      },
    });
    const out: { slug: string; title: string }[] = [];
    for (const r of rows) {
      const tr = r.translations.find((t) => t.locale === locale);
      if (tr) out.push({ slug: tr.slug, title: tr.title });
    }
    return out;
  },
);


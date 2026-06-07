import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";
import { computeReadingTimeMinutes } from "@/lib/reading-time";
import type { ArticleListItem, Difficulty } from "@/lib/data/articles";

/**
 * The two account-page lists (Likes + History) need the same article
 * shape as the academy cards plus one extra timestamp ("liked at" /
 * "last viewed"). We project that as `at: Date` so the card layer
 * stays oblivious to which list it's in.
 */
export type UserArticleListItem = ArticleListItem & {
  /** When the user liked the article / last viewed it. */
  at: Date;
  /** History-only: how many distinct sessions visited the article. */
  viewCount?: number;
};

/** Same column set as `ARTICLE_LIST_SELECT` so toListItem can reuse. */
const ARTICLE_FIELDS = {
  id: true,
  coverImage: true,
  publishedAt: true,
  difficulty: true,
  likeCount: true,
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

type ArticleRow = {
  id: string;
  coverImage: string | null;
  publishedAt: Date | null;
  difficulty: Difficulty;
  likeCount: number;
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

function pickTranslation(row: ArticleRow, locale: Locale) {
  return row.translations.find((t) => t.locale === locale) ?? null;
}

function toItem(
  row: ArticleRow,
  locale: Locale,
  at: Date,
  viewCount?: number,
): UserArticleListItem | null {
  const tr = pickTranslation(row, locale);
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
    author: row.author,
    isFallback: tr.locale !== locale,
    at,
    viewCount,
  };
}

/** Most recent likes, newest first. */
export async function listUserLikedArticles(
  userId: string,
  locale: Locale,
  limit = 50,
): Promise<UserArticleListItem[]> {
  const rows = await prisma.articleLike.findMany({
    where: {
      userId,
      article: {
        status: "PUBLISHED",
        translations: { some: { status: "PUBLISHED", locale } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { article: { select: ARTICLE_FIELDS } },
  });
  return rows
    .map((r) =>
      toItem(r.article as unknown as ArticleRow, locale, r.createdAt),
    )
    .filter((x): x is UserArticleListItem => x !== null);
}

/** Reading history, most recently viewed first. Includes per-article
 *  re-read count so the card can show "Last viewed N hours ago · 3 reads". */
export async function listUserViewedArticles(
  userId: string,
  locale: Locale,
  limit = 50,
): Promise<UserArticleListItem[]> {
  const rows = await prisma.articleView.findMany({
    where: {
      userId,
      article: {
        status: "PUBLISHED",
        translations: { some: { status: "PUBLISHED", locale } },
      },
    },
    orderBy: { viewedAt: "desc" },
    take: limit,
    include: { article: { select: ARTICLE_FIELDS } },
  });
  return rows
    .map((r) =>
      toItem(
        r.article as unknown as ArticleRow,
        locale,
        r.viewedAt,
        r.count,
      ),
    )
    .filter((x): x is UserArticleListItem => x !== null);
}

export async function countUserLikes(userId: string): Promise<number> {
  return prisma.articleLike.count({ where: { userId } });
}

export async function countUserViews(userId: string): Promise<number> {
  return prisma.articleView.count({ where: { userId } });
}

import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";

export type SearchHit = {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
  moduleSlug: string;
  moduleName: string;
  score: number;
  matchedSnippet: string | null;
};

/**
 * Search published articles. Two-pass:
 *   1) MySQL FULLTEXT MATCH … AGAINST … IN NATURAL LANGUAGE MODE on
 *      (title, excerpt, bodyMdx). Fast, ranked by relevance.
 *   2) If 0 hits, fall back to ILIKE on title+excerpt — catches short
 *      queries (< minimum fulltext word length) and Vietnamese terms
 *      that the default tokenizer chokes on.
 *
 * Note: for production-grade Vietnamese search precision, add an ngram
 * fulltext index with `WITH PARSER ngram` (PLAN §11) or move search to
 * Meilisearch/Typesense.
 */
export type SearchHitsPage = {
  hits: SearchHit[];
  nextOffset: number | null;
};

/**
 * Offset-paginated wrapper around `searchPublishedArticles` for infinite
 * scroll on the /search page. Fulltext score isn't stable as a cursor
 * (ties + score drift across batches), so we use offset paging — fine
 * for the typical <200 results a relevance query returns.
 */
export async function searchPublishedArticlesPage(
  query: string,
  locale: Locale,
  opts: { offset?: number; limit?: number } = {},
): Promise<SearchHitsPage> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12));
  const offset = Math.max(0, opts.offset ?? 0);
  // Fetch `offset + limit + 1` to know if there's more without a count(*).
  const rows = await searchPublishedArticles(query, locale, offset + limit + 1);
  const slice = rows.slice(offset, offset + limit);
  const hasMore = rows.length > offset + limit;
  return {
    hits: slice,
    nextOffset: hasMore ? offset + limit : null,
  };
}

export const searchPublishedArticles = cache(
  async (query: string, locale: Locale, limit = 30): Promise<SearchHit[]> => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // Append wildcard for prefix matching in BOOLEAN MODE? Stick to
    // NATURAL LANGUAGE MODE for ranking. Strip operators just in case.
    const safe = trimmed.replace(/[+\-<>()~*"@]/g, " ").slice(0, 200);

    type RawHit = {
      id: string;
      articleId: string;
      slug: string;
      title: string;
      excerpt: string | null;
      publishedAt: Date | null;
      moduleSlug: string;
      moduleName: string | null;
      score: number;
    };

    const fulltext = await prisma.$queryRaw<RawHit[]>(
      Prisma.sql`
        SELECT
          at.id              AS id,
          at.articleId       AS articleId,
          at.slug            AS slug,
          at.title           AS title,
          at.excerpt         AS excerpt,
          at.publishedAt     AS publishedAt,
          m.slug             AS moduleSlug,
          mt.name            AS moduleName,
          MATCH(at.title, at.excerpt, at.bodyMdx)
            AGAINST (${safe} IN NATURAL LANGUAGE MODE) AS score
        FROM ArticleTranslation at
        INNER JOIN Article a ON a.id = at.articleId
        INNER JOIN Module m ON m.id = a.moduleId
        LEFT JOIN ModuleTranslation mt
          ON mt.moduleId = m.id AND mt.locale = ${locale}
        WHERE at.locale = ${locale}
          AND at.status = 'PUBLISHED'
          AND a.status = 'PUBLISHED'
          AND MATCH(at.title, at.excerpt, at.bodyMdx)
              AGAINST (${safe} IN NATURAL LANGUAGE MODE)
        ORDER BY score DESC
        LIMIT ${limit}
      `,
    );

    if (fulltext.length > 0) {
      return fulltext.map((r) => toHit(r, safe));
    }

    // Fallback — case-insensitive substring search across title + excerpt.
    const fallback = await prisma.articleTranslation.findMany({
      where: {
        locale,
        status: "PUBLISHED",
        article: { status: "PUBLISHED" },
        OR: [
          { title: { contains: safe } },
          { excerpt: { contains: safe } },
        ],
      },
      include: {
        article: {
          select: {
            id: true,
            module: {
              select: {
                slug: true,
                translations: {
                  where: { locale },
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });

    return fallback.map((r) => ({
      articleId: r.article.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      publishedAt: r.publishedAt,
      moduleSlug: r.article.module.slug,
      moduleName: r.article.module.translations[0]?.name ?? r.article.module.slug,
      score: 0,
      matchedSnippet: makeSnippet(r.excerpt ?? r.title, safe),
    }));
  },
);

function toHit(
  r: {
    articleId: string;
    slug: string;
    title: string;
    excerpt: string | null;
    publishedAt: Date | null;
    moduleSlug: string;
    moduleName: string | null;
    score: number;
  },
  query: string,
): SearchHit {
  return {
    articleId: r.articleId,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    publishedAt: r.publishedAt,
    moduleSlug: r.moduleSlug,
    moduleName: r.moduleName ?? r.moduleSlug,
    score: Number(r.score ?? 0),
    matchedSnippet: makeSnippet(r.excerpt ?? r.title, query),
  };
}

/** Return ~180-char window around the first match (case-insensitive). */
function makeSnippet(text: string, query: string): string | null {
  if (!text) return null;
  const lower = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase().split(/\s+/)[0];
  if (!needle) return text.slice(0, 180);
  const idx = lower.indexOf(needle);
  if (idx === -1) return text.slice(0, 180);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + needle.length + 120);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

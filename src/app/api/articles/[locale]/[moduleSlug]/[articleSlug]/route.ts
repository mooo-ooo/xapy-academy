import { notFound } from "next/navigation";
import { loadArticleForReading } from "@/lib/data/articles";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { routing } from "@/i18n/routing";

/**
 * AI-readable Markdown mirror.
 *
 * URL: /api/articles/<locale>/<module>/<articleSlug>
 * Used by llms.txt for LLM crawlers (GPTBot, ClaudeBot, PerplexityBot…)
 * to ingest content without parsing HTML.
 *
 * Lives under /api/ to avoid the dynamic-segment-with-extension routing
 * collision with the page route at /[locale]/academy/[moduleSlug]/[articleSlug].
 */
export const revalidate = 300;

export async function GET(
  _req: Request,
  ctx: {
    params: Promise<{
      locale: string;
      moduleSlug: string;
      articleSlug: string;
    }>;
  },
) {
  const { locale, moduleSlug, articleSlug } = await ctx.params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();

  const { effective } = await resolveLocaleForRequest(locale);
  const article = await loadArticleForReading(
    moduleSlug,
    articleSlug,
    effective,
  );
  if (!article || article.slug !== articleSlug) notFound();

  const frontmatter = [
    "---",
    `title: ${yaml(article.title)}`,
    article.excerpt ? `description: ${yaml(article.excerpt)}` : null,
    `language: ${article.renderedLocale}`,
    `module: ${article.moduleSlug}`,
    `author: ${yaml(article.authorName)}`,
    article.publishedAt
      ? `published: ${article.publishedAt.toISOString()}`
      : null,
    article.updatedAt ? `updated: ${article.updatedAt.toISOString()}` : null,
    article.keywords.length > 0
      ? `keywords: ${yaml(article.keywords.join(", "))}`
      : null,
    `reading_time: ${article.readingTimeMinutes} min`,
    `canonical: /${article.renderedLocale}/academy/${article.moduleSlug}/${article.slug}`,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const body = `# ${article.title}\n\n${article.bodyMdx}\n`;

  return new Response(frontmatter + body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
      // The HTML page is canonical; keep the .md mirror out of the index.
      "x-robots-tag": "noindex",
    },
  });
}

function yaml(s: string): string {
  if (/[:#\n"]/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

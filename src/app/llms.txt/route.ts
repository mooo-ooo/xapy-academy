import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { siteOrigin } from "@/lib/seo";
import { getSiteSetting } from "@/lib/data/site";

/**
 * llms.txt — https://llmstxt.org spec.
 *
 * One concise, AI-readable index of the public site. We emit it in the
 * public locale (the canonical content guests can read). Each article
 * links to its plain-Markdown mirror at `<slug>.md`.
 */
export const revalidate = 3600;

export async function GET() {
  const origin = siteOrigin().replace(/\/$/, "");
  const site = await getSiteSetting();
  const locale = site.publicLocale;

  const [modules, articles] = await Promise.all([
    prisma.module.findMany({
      where: { isPublic: true },
      include: {
        translations: { where: { locale }, take: 1 },
      },
      orderBy: { sortOrder: "asc" },
    }).catch(() => []),
    prisma.articleTranslation.findMany({
      where: {
        locale,
        status: "PUBLISHED",
        article: { status: "PUBLISHED" },
      },
      include: {
        article: {
          select: { module: { select: { slug: true } } },
        },
      },
      orderBy: { publishedAt: "desc" },
    }).catch(() => []),
  ]);

  const lines: string[] = [];
  lines.push(`# ${site.siteName}`);
  lines.push("");
  lines.push(`> Institutional-grade education for the modern trader.`);
  lines.push("");
  lines.push(
    `This file lists the canonical public articles. Each article is available as plain Markdown by appending \`.md\` to its URL.`,
  );
  lines.push("");

  if (modules.length > 0) {
    lines.push("## Modules");
    lines.push("");
    for (const mod of modules) {
      const tr = mod.translations[0];
      const url = `${origin}/${locale}/academy/${mod.slug}`;
      const name = tr?.name ?? mod.slug;
      const desc = tr?.description ? `: ${tr.description}` : "";
      lines.push(`- [${name}](${url})${desc}`);
    }
    lines.push("");
  }

  if (articles.length > 0) {
    lines.push("## Articles");
    lines.push("");
    for (const a of articles) {
      const url = `${origin}/api/articles/${locale}/${a.article.module.slug}/${a.slug}`;
      const desc = a.excerpt ? `: ${a.excerpt}` : "";
      lines.push(`- [${a.title}](${url})${desc}`);
    }
    lines.push("");
  }

  lines.push("## Glossary");
  lines.push("");
  lines.push(
    `- [Trading terminology](${origin}/${locale}/academy/glossary): canonical definitions for the vocabulary used across the Academy`,
  );
  lines.push("");

  // Index of supported locales — AI agents can fetch alternates.
  lines.push("## Localized indexes");
  lines.push("");
  for (const l of routing.locales) {
    lines.push(`- ${l.toUpperCase()}: ${origin}/${l}/academy`);
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      // An AI-ingestion index, not an indexable page.
      "x-robots-tag": "noindex",
    },
  });
}

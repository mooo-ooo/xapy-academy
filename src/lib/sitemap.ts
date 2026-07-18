import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { siteOrigin, withXDefault } from "@/lib/seo";
import { getEnabledLocales, getSiteSetting } from "@/lib/data/site";

export type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapUrl = {
  loc: string;
  lastModified?: Date;
  changeFrequency?: ChangeFreq;
  priority?: number;
  alternates?: Record<string, string>;
};

export type SitemapChild = { slug: string; lastModified?: Date };

const RESERVED = new Set(["pages", "modules", "authors"]);

const PUBLISHED_AUTHOR_WHERE = {
  slug: { not: null },
  articles: {
    some: {
      status: "PUBLISHED" as const,
      translations: { some: { status: "PUBLISHED" as const } },
    },
  },
};

function origin(): string {
  return siteOrigin().replace(/\/$/, "");
}

async function context() {
  const enabled = (await getEnabledLocales()) as unknown as string[];
  const { publicLocale } = await getSiteSetting();
  return {
    enabled,
    enabledSet: new Set<string>(enabled),
    publicLocale: publicLocale as string,
  };
}

export async function getSitemapChildren(): Promise<SitemapChild[]> {
  const children: SitemapChild[] = [{ slug: "pages" }, { slug: "modules" }];
  try {
    const [modules, authorCount] = await Promise.all([
      prisma.module.findMany({
        where: {
          articles: {
            some: {
              status: "PUBLISHED",
              translations: { some: { status: "PUBLISHED" } },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          articles: {
            where: { status: "PUBLISHED" },
            select: {
              translations: {
                where: { status: "PUBLISHED" },
                select: { updatedAt: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where: PUBLISHED_AUTHOR_WHERE }),
    ]);
    if (authorCount > 0) children.push({ slug: "authors" });
    for (const mod of modules) {
      let last: Date | undefined;
      for (const article of mod.articles) {
        for (const tr of article.translations) {
          if (!last || tr.updatedAt > last) last = tr.updatedAt;
        }
      }
      const childSlug = RESERVED.has(mod.slug)
        ? `module-${mod.slug}`
        : mod.slug;
      children.push({ slug: childSlug, lastModified: last });
    }
  } catch {
    return children;
  }
  return children;
}

export async function buildChildUrls(
  slug: string,
): Promise<SitemapUrl[] | null> {
  if (slug === "pages") return buildPageUrls();
  if (slug === "modules") return buildModuleIndexUrls();
  if (slug === "authors") return buildAuthorUrls();
  if (
    slug.startsWith("module-") &&
    RESERVED.has(slug.slice("module-".length))
  ) {
    return buildModuleArticleUrls(slug.slice("module-".length));
  }
  return buildModuleArticleUrls(slug);
}

async function buildPageUrls(): Promise<SitemapUrl[]> {
  const { enabled, publicLocale } = await context();
  const o = origin();
  const urls: SitemapUrl[] = [];

  const landingLangs = withXDefault(
    Object.fromEntries(enabled.map((l) => [l, `${o}/${l}/academy`])),
    publicLocale,
  );
  for (const locale of enabled) {
    urls.push({
      loc: `${o}/${locale}/academy`,
      changeFrequency: "daily",
      priority: 1.0,
      alternates: landingLangs,
    });
  }

  const glossaryLangs = withXDefault(
    Object.fromEntries(
      enabled.map((l) => [l, `${o}/${l}/academy/glossary`]),
    ),
    publicLocale,
  );
  for (const locale of enabled) {
    urls.push({
      loc: `${o}/${locale}/academy/glossary`,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: glossaryLangs,
    });
  }

  return urls;
}

async function buildModuleIndexUrls(): Promise<SitemapUrl[]> {
  const { enabledSet, publicLocale } = await context();
  const o = origin();
  const urls: SitemapUrl[] = [];

  const modules = await prisma.module.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: "asc" },
    include: { translations: { select: { locale: true } } },
  });

  for (const mod of modules) {
    const present = new Set(
      mod.translations
        .map((t) => t.locale)
        .filter((l) => enabledSet.has(l)),
    );
    if (present.size === 0) {
      if (enabledSet.has(routing.defaultLocale)) {
        present.add(routing.defaultLocale);
      } else {
        continue;
      }
    }
    const langMap = withXDefault(
      Object.fromEntries(
        [...present].map((l) => [l, `${o}/${l}/academy/${mod.slug}`]),
      ),
      publicLocale,
    );
    for (const locale of present) {
      urls.push({
        loc: `${o}/${locale}/academy/${mod.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: langMap,
      });
    }
  }

  return urls;
}

async function buildAuthorUrls(): Promise<SitemapUrl[]> {
  const { enabled, publicLocale } = await context();
  const o = origin();
  const urls: SitemapUrl[] = [];

  const authors = await prisma.user.findMany({
    where: PUBLISHED_AUTHOR_WHERE,
    select: { slug: true, updatedAt: true },
    orderBy: { createdAt: "asc" },
  });

  for (const author of authors) {
    if (!author.slug) continue;
    const langMap = withXDefault(
      Object.fromEntries(
        enabled.map((l) => [l, `${o}/${l}/authors/${author.slug}`]),
      ),
      publicLocale,
    );
    for (const locale of enabled) {
      urls.push({
        loc: `${o}/${locale}/authors/${author.slug}`,
        lastModified: author.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: langMap,
      });
    }
  }

  return urls;
}

async function buildModuleArticleUrls(
  moduleSlug: string,
): Promise<SitemapUrl[] | null> {
  const { enabledSet, publicLocale } = await context();
  const o = origin();
  const urls: SitemapUrl[] = [];

  const mod = await prisma.module.findUnique({
    where: { slug: moduleSlug },
    select: { id: true },
  });
  if (!mod) return null;

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", module: { slug: moduleSlug } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      translations: {
        where: { status: "PUBLISHED" },
        select: { locale: true, slug: true, updatedAt: true },
      },
    },
  });

  for (const article of articles) {
    const trs = article.translations.filter((t) => enabledSet.has(t.locale));
    if (trs.length === 0) continue;
    const langMap = withXDefault(
      Object.fromEntries(
        trs.map((t) => [
          t.locale,
          `${o}/${t.locale}/academy/${moduleSlug}/${t.slug}`,
        ]),
      ),
      publicLocale,
    );
    for (const tr of trs) {
      urls.push({
        loc: `${o}/${tr.locale}/academy/${moduleSlug}/${tr.slug}`,
        lastModified: tr.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: langMap,
      });
    }
  }

  return urls;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderUrlset(urls: SitemapUrl[]): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const url of urls) {
    parts.push("<url>");
    parts.push(`<loc>${escapeXml(url.loc)}</loc>`);
    if (url.alternates) {
      for (const [hreflang, href] of Object.entries(url.alternates)) {
        parts.push(
          `<xhtml:link rel="alternate" hreflang="${escapeXml(
            hreflang,
          )}" href="${escapeXml(href)}"/>`,
        );
      }
    }
    if (url.lastModified) {
      parts.push(`<lastmod>${url.lastModified.toISOString()}</lastmod>`);
    }
    if (url.changeFrequency) {
      parts.push(`<changefreq>${url.changeFrequency}</changefreq>`);
    }
    if (typeof url.priority === "number") {
      parts.push(`<priority>${url.priority.toFixed(1)}</priority>`);
    }
    parts.push("</url>");
  }
  parts.push("</urlset>");
  return parts.join("\n");
}

export function renderSitemapIndex(children: SitemapChild[]): string {
  const o = origin();
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const child of children) {
    parts.push("<sitemap>");
    parts.push(`<loc>${escapeXml(`${o}/sitemap/${child.slug}.xml`)}</loc>`);
    if (child.lastModified) {
      parts.push(`<lastmod>${child.lastModified.toISOString()}</lastmod>`);
    }
    parts.push("</sitemap>");
  }
  parts.push("</sitemapindex>");
  return parts.join("\n");
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { siteOrigin, withXDefault } from "@/lib/seo";
import { getEnabledLocales, getSiteSetting } from "@/lib/data/site";

/**
 * Dynamic multilingual sitemap.
 *
 * For every PUBLISHED article we emit one <url> per locale where a
 * PUBLISHED translation exists, each with a <xhtml:link rel="alternate"
 * hreflang="..."> for every sibling translation. Module pages do the
 * same. The Academy landing is included per locale.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin().replace(/\/$/, "");
  const sitemap: MetadataRoute.Sitemap = [];
  const enabled = await getEnabledLocales();
  const enabledSet = new Set<string>(enabled);
  const { publicLocale } = await getSiteSetting();

  // Landing — one entry per enabled locale. The languages map (incl.
  // x-default → publicLocale) is identical across locales, so build once.
  const landingLangs = withXDefault(
    Object.fromEntries(enabled.map((l) => [l, `${origin}/${l}/academy`])),
    publicLocale,
  );
  for (const locale of enabled) {
    sitemap.push({
      url: `${origin}/${locale}/academy`,
      changeFrequency: "daily",
      priority: 1.0,
      alternates: { languages: landingLangs },
    });
  }

  // Glossary — file-based (lib/data/glossary.ts), present in every enabled
  // locale; a strong DefinedTermSet entity/passage citation target.
  const glossaryLangs = withXDefault(
    Object.fromEntries(
      enabled.map((l) => [l, `${origin}/${l}/academy/glossary`]),
    ),
    publicLocale,
  );
  for (const locale of enabled) {
    sitemap.push({
      url: `${origin}/${locale}/academy/glossary`,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: { languages: glossaryLangs },
    });
  }

  // Modules + articles need the DB. Tolerate an unreachable DB (e.g. a
  // build with no database, or a transient blip) — the landing + glossary
  // entries above already give a valid sitemap, and ISR regenerates this
  // with the full set once the DB is reachable again.
  try {
  // Modules — emit per enabled locale that has a translation.
  const modules = await prisma.module.findMany({
    where: { isPublic: true },
    include: { translations: { select: { locale: true } } },
  });
  for (const mod of modules) {
    const presentLocales = new Set(
      mod.translations
        .map((t) => t.locale)
        .filter((l) => enabledSet.has(l)),
    );
    if (presentLocales.size === 0) {
      if (enabledSet.has(routing.defaultLocale)) {
        presentLocales.add(routing.defaultLocale);
      } else {
        continue; // No enabled locale for this module — skip
      }
    }
    const langMap = withXDefault(
      Object.fromEntries(
        [...presentLocales].map((l) => [
          l,
          `${origin}/${l}/academy/${mod.slug}`,
        ]),
      ),
      publicLocale,
    );
    for (const locale of presentLocales) {
      sitemap.push({
        url: `${origin}/${locale}/academy/${mod.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages: langMap },
      });
    }
  }

  // Articles — emit one entry per (article, published translation in
  // an enabled locale).
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    include: {
      module: { select: { slug: true } },
      translations: {
        where: { status: "PUBLISHED" },
        select: { locale: true, slug: true, publishedAt: true, updatedAt: true },
      },
    },
  });
  for (const article of articles) {
    const enabledTrs = article.translations.filter((t) =>
      enabledSet.has(t.locale),
    );
    if (enabledTrs.length === 0) continue;
    const langMap = withXDefault(
      Object.fromEntries(
        enabledTrs.map((t) => [
          t.locale,
          `${origin}/${t.locale}/academy/${article.module.slug}/${t.slug}`,
        ]),
      ),
      publicLocale,
    );
    for (const tr of enabledTrs) {
      sitemap.push({
        url: `${origin}/${tr.locale}/academy/${article.module.slug}/${tr.slug}`,
        lastModified: tr.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: { languages: langMap },
      });
    }
  }
  } catch {
    // DB unavailable — keep the landing + glossary sitemap built above.
  }

  return sitemap;
}

// Cache sitemap output for an hour; admin can revalidate on publish via
// revalidatePath('/[locale]/academy', 'layout') flows already in place.
export const revalidate = 3600;

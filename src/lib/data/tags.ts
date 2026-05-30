import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";

export type TrendingTag = {
  slug: string;
  name: string;
};

/** Trending tags for the header strip, ordered alphabetically. */
export const listTrendingTags = cache(
  async (locale: Locale, limit = 6): Promise<TrendingTag[]> => {
    const tags = await prisma.tag.findMany({
      where: { isTrending: true },
      include: {
        translations: { where: { locale: { in: [locale, "en"] } } },
      },
      orderBy: { slug: "asc" },
      take: limit,
    });
    return tags.map((t) => {
      const tr =
        t.translations.find((x) => x.locale === locale) ??
        t.translations.find((x) => x.locale === "en");
      return { slug: t.slug, name: tr?.name ?? t.slug.toUpperCase() };
    });
  },
);

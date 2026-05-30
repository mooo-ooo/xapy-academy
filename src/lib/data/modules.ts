import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/routing";

export type ModuleCard = {
  id: string;
  slug: string;
  icon: string | null;
  name: string;
  description: string | null;
  articleCount: number;
};

/**
 * List public modules with translation in the given locale (falls back
 * to source locale if a translation is missing). Sorted by sortOrder.
 */
export const listPublicModules = cache(
  async (locale: Locale): Promise<ModuleCard[]> => {
    const modules = await prisma.module.findMany({
      where: { isPublic: true },
      orderBy: { sortOrder: "asc" },
      include: {
        translations: {
          where: { locale: { in: [locale, "en"] } },
        },
        _count: {
          select: {
            articles: {
              where: {
                status: "PUBLISHED",
                translations: {
                  some: { locale, status: "PUBLISHED" },
                },
              },
            },
          },
        },
      },
    });

    return modules.map((m) => {
      const tr =
        m.translations.find((t) => t.locale === locale) ??
        m.translations.find((t) => t.locale === "en");
      return {
        id: m.id,
        slug: m.slug,
        icon: m.icon,
        name: tr?.name ?? m.slug,
        description: tr?.description ?? null,
        articleCount: m._count.articles,
      };
    });
  },
);

/** Fetch one module + the translation closest to the requested locale. */
export const getPublicModule = cache(
  async (slug: string, locale: Locale) => {
    const mod = await prisma.module.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: { in: [locale, "en"] } } },
      },
    });
    if (!mod || !mod.isPublic) return null;
    const tr =
      mod.translations.find((t) => t.locale === locale) ??
      mod.translations.find((t) => t.locale === "en") ??
      null;
    return { ...mod, translation: tr };
  },
);

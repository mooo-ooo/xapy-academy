import { cache } from "react";
import { prisma } from "@/lib/db";
import { routing, type Locale } from "@/i18n/routing";

export type HeroLocaleContent = {
  title?: string;
  tagline?: string;
};
export type HeroTranslations = Record<string, HeroLocaleContent>;

export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };
export type FooterLocaleContent = {
  intro?: string;
  copyright?: string;
  columns?: FooterColumn[];
};
export type FooterSocial = { platform: string; url: string };
export type FooterConfig = {
  enabled: boolean;
  social: FooterSocial[];
  translations: Record<string, FooterLocaleContent>;
};

export type SiteSettingResolved = {
  publicLocale: Locale;
  supportedLocales: Locale[];
  siteName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  defaultOgImageUrl: string | null;
  defaultMetaDescription: string | null;
  contactEmail: string | null;
  twitterHandle: string | null;
  allowSelfSignup: boolean;
  signupRequiresApproval: boolean;
  heroImageUrl: string | null;
  heroTranslations: HeroTranslations;
  footer: FooterConfig;
};

function emptyFooter(): FooterConfig {
  return { enabled: false, social: [], translations: {} };
}

function parseFooterConfig(value: unknown): FooterConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyFooter();
  }
  const v = value as Record<string, unknown>;
  const social: FooterSocial[] = Array.isArray(v.social)
    ? (v.social as unknown[]).flatMap((s) => {
        if (!s || typeof s !== "object") return [];
        const r = s as Record<string, unknown>;
        if (typeof r.platform !== "string" || typeof r.url !== "string") {
          return [];
        }
        return [{ platform: r.platform, url: r.url }];
      })
    : [];
  const translations: Record<string, FooterLocaleContent> = {};
  if (v.translations && typeof v.translations === "object") {
    for (const [locale, raw] of Object.entries(
      v.translations as Record<string, unknown>,
    )) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const r = raw as Record<string, unknown>;
      const entry: FooterLocaleContent = {};
      if (typeof r.intro === "string") entry.intro = r.intro;
      if (typeof r.copyright === "string") entry.copyright = r.copyright;
      if (Array.isArray(r.columns)) {
        entry.columns = (r.columns as unknown[]).flatMap((col) => {
          if (!col || typeof col !== "object") return [];
          const c = col as Record<string, unknown>;
          const links = Array.isArray(c.links)
            ? (c.links as unknown[]).flatMap((l) => {
                if (!l || typeof l !== "object") return [];
                const lr = l as Record<string, unknown>;
                if (typeof lr.label !== "string" || typeof lr.href !== "string") {
                  return [];
                }
                return [{ label: lr.label, href: lr.href }];
              })
            : [];
          return [{ title: typeof c.title === "string" ? c.title : "", links }];
        });
      }
      translations[locale] = entry;
    }
  }
  return {
    enabled: v.enabled === true,
    social,
    translations,
  };
}

export type ResolvedFooter = {
  intro: string | null;
  copyright: string;
  columns: FooterColumn[];
  social: FooterSocial[];
};

export function resolveFooter(
  footer: FooterConfig,
  locale: string,
  publicLocale: string,
  siteName: string,
): ResolvedFooter {
  const order = [
    locale,
    publicLocale,
    "en",
    ...Object.keys(footer.translations),
  ];
  const pick = <K extends keyof FooterLocaleContent>(
    field: K,
  ): FooterLocaleContent[K] | undefined => {
    for (const l of order) {
      const v = footer.translations[l]?.[field];
      if (v !== undefined && v !== null && (!Array.isArray(v) || v.length > 0)) {
        return v;
      }
    }
    return undefined;
  };
  const year = new Date().getFullYear();
  const rawCopyright = pick("copyright") ?? "© {year} {siteName}";
  const copyright = rawCopyright
    .replaceAll("{year}", String(year))
    .replaceAll("{siteName}", siteName);
  return {
    intro: pick("intro") ?? null,
    copyright,
    columns: pick("columns") ?? [],
    social: footer.social,
  };
}

function parseHeroTranslations(value: unknown): HeroTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: HeroTranslations = {};
  for (const [locale, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    const entry: HeroLocaleContent = {};
    if (typeof r.title === "string") entry.title = r.title;
    if (typeof r.tagline === "string") entry.tagline = r.tagline;
    out[locale] = entry;
  }
  return out;
}

/**
 * Read SiteSetting (id=1) — cached per request via React `cache`.
 * Falls back to env defaults if the row is missing (pre-seed bootstrap).
 */
export const getSiteSetting = cache(async (): Promise<SiteSettingResolved> => {
  // Tolerate an unreachable DB (e.g. `next build` with no database, or a
  // transient blip) by falling back to env/defaults — same shape as the
  // pre-seed bootstrap path below.
  let row: Awaited<ReturnType<typeof prisma.siteSetting.findUnique>> = null;
  try {
    row = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  } catch {
    row = null;
  }
  if (!row) {
    return {
      publicLocale: (process.env.PUBLIC_LOCALE as Locale) ?? "en",
      // Default subset: just EN + VI (the languages we've actually
      // hand-translated). Admin can widen the set in /admin/settings.
      supportedLocales: ((["en", "vi"] as Locale[]).filter((l) =>
        (routing.locales as readonly string[]).includes(l),
      ) as Locale[]),
      siteName: "Kiyotaka Academy",
      tagline: null,
      logoUrl: null,
      faviconUrl: null,
      defaultOgImageUrl: null,
      defaultMetaDescription: null,
      contactEmail: null,
      twitterHandle: null,
      allowSelfSignup: true,
      signupRequiresApproval: true,
      heroImageUrl: null,
      heroTranslations: {},
      footer: emptyFooter(),
    };
  }
  const supported = Array.isArray(row.supportedLocales)
    ? (row.supportedLocales as unknown as string[])
    : [...routing.locales];
  return {
    publicLocale: row.publicLocale as Locale,
    supportedLocales: supported.filter((l): l is Locale =>
      (routing.locales as readonly string[]).includes(l),
    ),
    siteName: row.siteName,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    defaultOgImageUrl: row.defaultOgImageUrl,
    defaultMetaDescription: row.defaultMetaDescription,
    contactEmail: row.contactEmail,
    twitterHandle: row.twitterHandle,
    allowSelfSignup: row.allowSelfSignup,
    signupRequiresApproval: row.signupRequiresApproval,
    heroImageUrl: row.heroImageUrl,
    heroTranslations: parseHeroTranslations(row.heroTranslations),
    footer: parseFooterConfig(row.footerConfig),
  };
});

/**
 * The locales admin has actually enabled for the public site. Use this
 * (not `routing.locales`) wherever runtime filtering matters — language
 * switcher options, sitemap entries, hreflang maps, account preferredLang
 * dropdown, the [locale]/layout 404 guard, etc.
 *
 * `routing.locales` stays the static type-level superset (all messages/*.json
 * files); `enabled` is the admin-controlled subset of that superset that's
 * visible to readers right now.
 *
 * Cached per request — multiple consumers share one DB hit.
 */
export const getEnabledLocales = cache(async (): Promise<readonly Locale[]> => {
  const s = await getSiteSetting();
  return s.supportedLocales.length > 0
    ? (s.supportedLocales as readonly Locale[])
    : (["en"] as const);
});

/** Locale guests are forced onto. Always one of getEnabledLocales(). */
export const getPublicLocale = cache(async (): Promise<Locale> => {
  const s = await getSiteSetting();
  return s.publicLocale;
});

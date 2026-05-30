import { cache } from "react";
import { prisma } from "@/lib/db";
import { routing, type Locale } from "@/i18n/routing";

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
};

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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { routing } from "@/i18n/routing";

const localeEnum = z.enum(routing.locales as unknown as [string, ...string[]]);

const nullableUrl = z
  .string()
  .trim()
  .max(2048)
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .optional();

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional();

const schema = z.object({
  siteName: z.string().trim().min(1).max(120),
  tagline: nullableText(280),
  logoUrl: nullableUrl,
  faviconUrl: nullableUrl,
  defaultOgImageUrl: nullableUrl,
  defaultMetaDescription: nullableText(320),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .refine(
      (s) => s === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
      "Invalid email address",
    )
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional(),
  twitterHandle: z
    .string()
    .trim()
    .max(40)
    .refine(
      (s) => s === "" || /^@?[A-Za-z0-9_]{1,15}$/.test(s),
      "Invalid Twitter handle",
    )
    .transform((s) => {
      if (s === "") return null;
      return s.startsWith("@") ? s : `@${s}`;
    })
    .nullable()
    .optional(),
  allowSelfSignup: z.boolean().optional(),
  signupRequiresApproval: z.boolean().optional(),
  supportedLocales: z
    .array(localeEnum)
    .min(1, "Pick at least one locale")
    .optional(),
  publicLocale: localeEnum.optional(),
  heroImageUrl: nullableUrl,
  heroTranslations: z
    .record(
      z.string(),
      z.object({
        title: z.string().trim().max(200).optional(),
        tagline: z.string().trim().max(400).optional(),
      }),
    )
    .optional(),
  footerConfig: z
    .object({
      enabled: z.boolean(),
      social: z
        .array(
          z.object({
            platform: z.string().trim().max(20),
            url: z.string().trim().max(2048),
          }),
        )
        .max(16),
      translations: z.record(
        z.string(),
        z.object({
          intro: z.string().trim().max(800).optional(),
          copyright: z.string().trim().max(200).optional(),
          columns: z
            .array(
              z.object({
                title: z.string().trim().max(80),
                links: z
                  .array(
                    z.object({
                      label: z.string().trim().max(80),
                      href: z.string().trim().max(2048),
                    }),
                  )
                  .max(24),
              }),
            )
            .max(8)
            .optional(),
        }),
      ),
    })
    .optional(),
});

type FooterInput = NonNullable<z.infer<typeof schema>["footerConfig"]>;

function cleanFooterConfig(input: FooterInput): FooterInput {
  const valid = new Set(routing.locales as readonly string[]);
  const social = input.social
    .map((s) => ({ platform: s.platform.trim(), url: s.url.trim() }))
    .filter((s) => s.platform && s.url);
  const translations: FooterInput["translations"] = {};
  for (const [locale, c] of Object.entries(input.translations)) {
    if (!valid.has(locale)) continue;
    const columns = (c.columns ?? [])
      .map((col) => ({
        title: col.title.trim(),
        links: col.links
          .map((l) => ({ label: l.label.trim(), href: l.href.trim() }))
          .filter((l) => l.label && l.href),
      }))
      .filter((col) => col.title || col.links.length > 0);
    const entry: FooterInput["translations"][string] = {};
    if (c.intro?.trim()) entry.intro = c.intro.trim();
    if (c.copyright?.trim()) entry.copyright = c.copyright.trim();
    if (columns.length > 0) entry.columns = columns;
    if (Object.keys(entry).length > 0) translations[locale] = entry;
  }
  return { enabled: input.enabled, social, translations };
}

type HeroEntry = { title?: string; tagline?: string };

function cleanHeroTranslations(
  input: Record<string, HeroEntry> | undefined,
): Record<string, HeroEntry> {
  if (!input) return {};
  const valid = new Set(routing.locales as readonly string[]);
  const out: Record<string, HeroEntry> = {};
  for (const [locale, c] of Object.entries(input)) {
    if (!valid.has(locale)) continue;
    const entry: HeroEntry = {};
    if (c.title?.trim()) entry.title = c.title.trim();
    if (c.tagline?.trim()) entry.tagline = c.tagline.trim();
    if (Object.keys(entry).length > 0) out[locale] = entry;
  }
  return out;
}

/**
 * Phase 7B: locales (publicLocale / supportedLocales) moved to
 * `localization/actions.ts` (`updateLocalesAction`). This action only
 * writes the non-locale settings fields.
 */
export async function updateSiteSettingAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false as const,
      error: firstIssue?.message ?? "Invalid input",
    };
  }

  // Locales: if caller supplied them, validate publicLocale is in the
  // chosen subset. Cross-field rule lives here (not in zod) so we can
  // return a friendly error.
  const supported = parsed.data.supportedLocales;
  const publicLocale = parsed.data.publicLocale;
  if (supported && publicLocale && !supported.includes(publicLocale)) {
    return {
      ok: false as const,
      error: "publicLocale must be one of the supported locales",
    };
  }

  const data = {
    siteName: parsed.data.siteName,
    tagline: parsed.data.tagline ?? null,
    logoUrl: parsed.data.logoUrl ?? null,
    faviconUrl: parsed.data.faviconUrl ?? null,
    defaultOgImageUrl: parsed.data.defaultOgImageUrl ?? null,
    defaultMetaDescription: parsed.data.defaultMetaDescription ?? null,
    contactEmail: parsed.data.contactEmail ?? null,
    twitterHandle: parsed.data.twitterHandle ?? null,
    allowSelfSignup: parsed.data.allowSelfSignup ?? true,
    signupRequiresApproval: parsed.data.signupRequiresApproval ?? true,
    ...(supported ? { supportedLocales: supported } : {}),
    ...(publicLocale ? { publicLocale } : {}),
    ...(parsed.data.heroImageUrl !== undefined
      ? { heroImageUrl: parsed.data.heroImageUrl }
      : {}),
    ...(parsed.data.heroTranslations !== undefined
      ? { heroTranslations: cleanHeroTranslations(parsed.data.heroTranslations) }
      : {}),
    ...(parsed.data.footerConfig !== undefined
      ? { footerConfig: cleanFooterConfig(parsed.data.footerConfig) }
      : {}),
  };

  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      publicLocale: "en",
      supportedLocales: ["en"],
      ...data,
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "SITE_SETTINGS_UPDATE",
    target: "site",
    meta: data,
  });
  revalidatePath("/[locale]/academy", "layout");
  revalidatePath("/admin/settings");
  // Locale changes shape the sitemap + hreflang too.
  revalidatePath("/sitemap.xml");
  return { ok: true as const };
}

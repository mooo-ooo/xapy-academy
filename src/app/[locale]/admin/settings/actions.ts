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
});

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

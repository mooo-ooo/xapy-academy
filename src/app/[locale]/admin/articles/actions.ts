"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/roles";
import { auth, type AppRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { UPLOAD_DIR } from "@/lib/uploads";
import { htmlToMarkdown } from "@/lib/content";
import { routing } from "@/i18n/routing";

const LOCALES = routing.locales as unknown as [string, ...string[]];
const ARTICLE_STATUS = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
const TRANSLATION_STATUS = ["PENDING", "IN_PROGRESS", "REVIEW", "PUBLISHED"] as const;

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DIFFICULTY = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

const createArticleSchema = z.object({
  moduleId: z.string(),
  sourceLocale: z.enum(LOCALES),
  slug: z.string().min(2).max(160).regex(slugRegex),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(400).optional().or(z.literal("")),
  bodyHtml: z.string().min(1),
  metaTitle: z.string().max(160).optional().or(z.literal("")),
  metaDescription: z.string().max(280).optional().or(z.literal("")),
  difficulty: z.enum(DIFFICULTY).default("BEGINNER"),
  coverImage: z.string().max(500).optional().or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
});

export async function createArticleAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = createArticleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const slugExists = await prisma.articleTranslation.findUnique({
    where: {
      locale_slug: {
        locale: parsed.data.sourceLocale,
        slug: parsed.data.slug,
      },
    },
  });
  if (slugExists) {
    return { ok: false as const, error: "Slug already used in this locale" };
  }

  const maxRow = await prisma.article.aggregate({
    where: { moduleId: parsed.data.moduleId },
    _max: { sortOrder: true },
  });
  const sortOrder = ((maxRow._max.sortOrder as number | null) ?? -10) + 10;

  const article = await prisma.article.create({
    data: {
      moduleId: parsed.data.moduleId,
      authorId: session.user.id,
      sourceLocale: parsed.data.sourceLocale,
      status: "DRAFT",
      sourceVersion: 1,
      sortOrder,
      difficulty: parsed.data.difficulty,
      coverImage: parsed.data.coverImage || null,
      accentColor: parsed.data.accentColor || null,
      translations: {
        create: {
          locale: parsed.data.sourceLocale,
          slug: parsed.data.slug,
          title: parsed.data.title,
          excerpt: parsed.data.excerpt || null,
          bodyMdx: htmlToMarkdown(parsed.data.bodyHtml),
          bodyHtml: parsed.data.bodyHtml,
          metaTitle: parsed.data.metaTitle || null,
          metaDescription: parsed.data.metaDescription || null,
          status: "PUBLISHED",
          basedOnSourceVersion: 1,
        },
      },
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "ARTICLE_CREATE",
    target: article.id,
    meta: { sourceLocale: parsed.data.sourceLocale },
  });
  revalidatePath("/admin/articles");
  return { ok: true as const, id: article.id };
}

const updateSourceSchema = z.object({
  articleId: z.string(),
  moduleId: z.string().optional(),
  slug: z.string().min(2).max(160).regex(slugRegex),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(400).optional().or(z.literal("")),
  bodyHtml: z.string().min(1),
  metaTitle: z.string().max(160).optional().or(z.literal("")),
  metaDescription: z.string().max(280).optional().or(z.literal("")),
  difficulty: z.enum(DIFFICULTY).optional(),
  coverImage: z.string().max(500).optional().or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
  ogImage: z.string().max(2048).optional().or(z.literal("")),
});

export async function updateArticleSourceAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = updateSourceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const article = await prisma.article.findUnique({
    where: { id: parsed.data.articleId },
    include: {
      translations: {
        select: { id: true, locale: true, bodyMdx: true, bodyHtml: true },
      },
    },
  });
  if (!article) return { ok: false as const, error: "Article not found" };

  const source = article.translations.find(
    (t) => t.locale === article.sourceLocale,
  );
  if (!source) return { ok: false as const, error: "Source translation missing" };

  const bodyChanged =
    (source.bodyHtml ?? "").trim() !== parsed.data.bodyHtml.trim();
  const nextVersion = bodyChanged
    ? article.sourceVersion + 1
    : article.sourceVersion;

  await prisma.$transaction([
    prisma.article.update({
      where: { id: article.id },
      data: {
        sourceVersion: nextVersion,
        ...(parsed.data.moduleId
          ? { moduleId: parsed.data.moduleId }
          : {}),
        ...(parsed.data.difficulty
          ? { difficulty: parsed.data.difficulty }
          : {}),
        ...(parsed.data.coverImage !== undefined
          ? { coverImage: parsed.data.coverImage || null }
          : {}),
        ...(parsed.data.accentColor !== undefined
          ? { accentColor: parsed.data.accentColor || null }
          : {}),
      },
    }),
    prisma.articleTranslation.update({
      where: { id: source.id },
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt || null,
        bodyMdx: htmlToMarkdown(parsed.data.bodyHtml),
        bodyHtml: parsed.data.bodyHtml,
        metaTitle: parsed.data.metaTitle || null,
        metaDescription: parsed.data.metaDescription || null,
        ogImage: parsed.data.ogImage || null,
        basedOnSourceVersion: nextVersion,
      },
    }),
    // Bump non-source translations into REVIEW if the body changed —
    // they're now potentially stale.
    ...(bodyChanged
      ? [
          prisma.articleTranslation.updateMany({
            where: {
              articleId: article.id,
              locale: { not: article.sourceLocale },
              status: "PUBLISHED",
            },
            data: { status: "REVIEW" },
          }),
        ]
      : []),
  ]);

  await logAudit({
    actorId: session.user.id,
    action: bodyChanged
      ? "ARTICLE_SOURCE_UPDATE_BODY"
      : "ARTICLE_SOURCE_UPDATE_META",
    target: article.id,
    meta: { sourceVersion: nextVersion },
  });
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${article.id}/edit`);
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const, sourceVersion: nextVersion, bodyChanged };
}

function uploadNamesFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re = /\/uploads\/([A-Za-z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

async function deleteOrphanUploads(names: string[]) {
  const unique = [...new Set(names.map((n) => basename(n)))].filter(Boolean);
  for (const name of unique) {
    const [coverCount, trCount, site] = await Promise.all([
      prisma.article.count({ where: { coverImage: { contains: name } } }),
      prisma.articleTranslation.count({
        where: {
          OR: [{ ogImage: { contains: name } }, { bodyMdx: { contains: name } }],
        },
      }),
      prisma.siteSetting.findFirst({
        where: {
          OR: [
            { logoUrl: { contains: name } },
            { logoUrlLight: { contains: name } },
            { logoUrlDark: { contains: name } },
            { faviconUrl: { contains: name } },
            { defaultOgImageUrl: { contains: name } },
            { heroImageUrl: { contains: name } },
          ],
        },
        select: { id: true },
      }),
    ]);
    if (coverCount === 0 && trCount === 0 && !site) {
      try {
        await unlink(join(UPLOAD_DIR, name));
      } catch {
        void 0;
      }
    }
  }
}

const deleteArticleSchema = z.object({ articleId: z.string() });

export async function deleteArticleAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = deleteArticleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const article = await prisma.article.findUnique({
    where: { id: parsed.data.articleId },
    include: { translations: { select: { ogImage: true, bodyMdx: true } } },
  });
  if (!article) return { ok: false as const, error: "Article not found" };

  const names: string[] = [...uploadNamesFromText(article.coverImage)];
  for (const tr of article.translations) {
    names.push(...uploadNamesFromText(tr.ogImage));
    names.push(...uploadNamesFromText(tr.bodyMdx));
  }

  await prisma.article.delete({ where: { id: article.id } });
  await deleteOrphanUploads(names);

  await logAudit({
    actorId: session.user.id,
    action: "ARTICLE_DELETE",
    target: article.id,
    meta: { images: [...new Set(names.map((n) => basename(n)))] },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/[locale]/academy", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemap/[slug]", "page");
  return { ok: true as const };
}

const reorderArticleSchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});

export async function reorderArticleAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = reorderArticleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const target = await prisma.article.findUnique({
    where: { id: parsed.data.id },
    select: { moduleId: true },
  });
  if (!target) return { ok: false as const, error: "Article not found" };

  const all = await prisma.article.findMany({
    where: { moduleId: target.moduleId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const idx = all.findIndex((a) => a.id === parsed.data.id);
  if (idx === -1) return { ok: false as const, error: "Article not found" };
  const swapIdx = parsed.data.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) {
    return { ok: false as const, error: "Already at edge" };
  }

  const next = [...all];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

  await prisma.$transaction(
    next.map((a, i) =>
      prisma.article.update({
        where: { id: a.id },
        data: { sortOrder: i * 10 },
      }),
    ),
  );
  await logAudit({
    actorId: session.user.id,
    action: "ARTICLE_REORDER",
    target: parsed.data.id,
    meta: { direction: parsed.data.direction, moduleId: target.moduleId },
  });
  revalidatePath(`/admin/modules/${target.moduleId}`);
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const statusSchema = z.object({
  articleId: z.string(),
  status: z.enum(ARTICLE_STATUS),
});

export async function setArticleStatusAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "PUBLISHED") updates.publishedAt = new Date();
  await prisma.article.update({
    where: { id: parsed.data.articleId },
    data: updates,
  });
  await logAudit({
    actorId: session.user.id,
    action: "ARTICLE_STATUS",
    target: parsed.data.articleId,
    meta: { status: parsed.data.status },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const assignSchema = z.object({
  articleId: z.string(),
  locale: z.enum(LOCALES),
  translatorId: z.string().nullable(),
});

export async function assignTranslatorAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  if (parsed.data.locale === undefined) {
    return { ok: false as const, error: "Locale required" };
  }

  const article = await prisma.article.findUnique({
    where: { id: parsed.data.articleId },
  });
  if (!article) return { ok: false as const, error: "Article not found" };
  if (parsed.data.locale === article.sourceLocale) {
    return { ok: false as const, error: "Can't translate to source locale" };
  }

  const existing = await prisma.articleTranslation.findUnique({
    where: {
      articleId_locale: {
        articleId: article.id,
        locale: parsed.data.locale,
      },
    },
  });

  if (existing) {
    await prisma.articleTranslation.update({
      where: { id: existing.id },
      data: { translatorId: parsed.data.translatorId },
    });
  } else {
    // Provisional row: copy source slug+title as starting point.
    const source = await prisma.articleTranslation.findUnique({
      where: {
        articleId_locale: {
          articleId: article.id,
          locale: article.sourceLocale,
        },
      },
    });
    if (!source)
      return { ok: false as const, error: "Source translation missing" };
    await prisma.articleTranslation.create({
      data: {
        articleId: article.id,
        locale: parsed.data.locale,
        translatorId: parsed.data.translatorId,
        slug: `${source.slug}-${parsed.data.locale}`,
        title: source.title,
        excerpt: source.excerpt,
        bodyMdx: source.bodyMdx,
        bodyHtml: source.bodyHtml,
        status: "IN_PROGRESS",
        basedOnSourceVersion: article.sourceVersion,
      },
    });
  }
  await logAudit({
    actorId: session.user.id,
    action: "TRANSLATION_ASSIGN",
    target: article.id,
    meta: {
      locale: parsed.data.locale,
      translatorId: parsed.data.translatorId,
    },
  });
  revalidatePath(`/admin/articles/${article.id}/edit`);
  return { ok: true as const };
}

const saveTranslationSchema = z.object({
  articleId: z.string(),
  locale: z.enum(LOCALES),
  slug: z.string().min(2).max(160).regex(slugRegex),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(400).optional().or(z.literal("")),
  bodyHtml: z.string().min(1),
  metaTitle: z.string().max(160).optional().or(z.literal("")),
  metaDescription: z.string().max(280).optional().or(z.literal("")),
  ogImage: z.string().max(2048).optional().or(z.literal("")),
});

async function loadOrUnauthorized(
  articleId: string,
  locale: string,
  allowedRoles: AppRole[],
) {
  const session = await auth();
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return { error: "Forbidden" as const };
  }
  const tr = await prisma.articleTranslation.findUnique({
    where: { articleId_locale: { articleId, locale } },
    include: { article: true },
  });
  if (!tr) return { error: "Translation not found" as const };
  // CTV may only edit translations explicitly assigned to them.
  if (
    session.user.role === "CTV" &&
    tr.translatorId !== session.user.id
  ) {
    return { error: "Forbidden" as const };
  }
  return { session, tr };
}

export async function saveTranslationAction(raw: unknown) {
  const parsed = saveTranslationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const ctx = await loadOrUnauthorized(
    parsed.data.articleId,
    parsed.data.locale,
    [...ADMIN_ROLES, "CTV"],
  );
  if ("error" in ctx) return { ok: false as const, error: ctx.error };

  await prisma.articleTranslation.update({
    where: { id: ctx.tr.id },
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || null,
      bodyMdx: htmlToMarkdown(parsed.data.bodyHtml),
      bodyHtml: parsed.data.bodyHtml,
      metaTitle: parsed.data.metaTitle || null,
      metaDescription: parsed.data.metaDescription || null,
      ogImage: parsed.data.ogImage || null,
      status:
        ctx.tr.status === "PENDING" ? "IN_PROGRESS" : ctx.tr.status,
      basedOnSourceVersion: ctx.tr.article.sourceVersion,
    },
  });
  await logAudit({
    actorId: ctx.session.user.id,
    action: "TRANSLATION_SAVE",
    target: parsed.data.articleId,
    meta: { locale: parsed.data.locale },
  });
  return { ok: true as const };
}

const setTranslationStatusSchema = z.object({
  articleId: z.string(),
  locale: z.enum(LOCALES),
  status: z.enum(TRANSLATION_STATUS),
});

export async function setTranslationStatusAction(raw: unknown) {
  const parsed = setTranslationStatusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  // Authorization: CTV can submit (→ REVIEW); only ADMIN can publish.
  const requiredRoles: AppRole[] =
    parsed.data.status === "PUBLISHED"
      ? [...ADMIN_ROLES]
      : [...ADMIN_ROLES, "CTV"];
  const ctx = await loadOrUnauthorized(
    parsed.data.articleId,
    parsed.data.locale,
    requiredRoles,
  );
  if ("error" in ctx) return { ok: false as const, error: ctx.error };

  const data: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "PUBLISHED") data.publishedAt = new Date();
  await prisma.articleTranslation.update({
    where: { id: ctx.tr.id },
    data,
  });
  await logAudit({
    actorId: ctx.session.user.id,
    action: `TRANSLATION_${parsed.data.status}`,
    target: parsed.data.articleId,
    meta: { locale: parsed.data.locale },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/admin/translations");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const updateStatsSchema = z.object({
  articleId: z.string(),
  viewCount: z.number().int().min(0).max(99_999_999),
  likeCount: z.number().int().min(0).max(99_999_999),
});

/**
 * Admin manual override of the denormalised view / like counters on
 * Article. Useful for tests, migrations, or fixing visibly-off totals.
 * Does NOT touch ArticleLike rows; users liking after the override
 * increment from the new baseline.
 */
export async function updateArticleStatsAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = updateStatsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  await prisma.article.update({
    where: { id: parsed.data.articleId },
    data: {
      viewCount: parsed.data.viewCount,
      likeCount: parsed.data.likeCount,
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "ARTICLE_STATS_UPDATE",
    target: parsed.data.articleId,
    meta: {
      viewCount: parsed.data.viewCount,
      likeCount: parsed.data.likeCount,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${parsed.data.articleId}/edit`);
  return { ok: true as const };
}

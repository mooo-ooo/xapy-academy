"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { routing } from "@/i18n/routing";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugRegex, "Use lowercase letters, digits and dashes only"),
});

export async function createTagAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const exists = await prisma.tag.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (exists) return { ok: false as const, error: "Slug already exists" };
  const created = await prisma.tag.create({ data: { slug: parsed.data.slug } });
  await logAudit({
    actorId: session.user.id,
    action: "TAG_CREATE",
    target: created.id,
  });
  revalidatePath("/admin/tags");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const, id: created.id };
}

const translationSchema = z.object({
  tagId: z.string(),
  locale: z.enum(routing.locales as unknown as [string, ...string[]]),
  name: z.string().min(1).max(80),
});

export async function upsertTagTranslationAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = translationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  await prisma.tagTranslation.upsert({
    where: {
      tagId_locale: { tagId: parsed.data.tagId, locale: parsed.data.locale },
    },
    update: { name: parsed.data.name },
    create: {
      tagId: parsed.data.tagId,
      locale: parsed.data.locale,
      name: parsed.data.name,
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "TAG_TRANSLATION_UPSERT",
    target: parsed.data.tagId,
    meta: { locale: parsed.data.locale },
  });
  revalidatePath(`/admin/tags/${parsed.data.tagId}`);
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const toggleSchema = z.object({ id: z.string(), isTrending: z.boolean() });

export async function toggleTrendingAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = toggleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  await prisma.tag.update({
    where: { id: parsed.data.id },
    data: { isTrending: parsed.data.isTrending },
  });
  await logAudit({
    actorId: session.user.id,
    action: "TAG_TRENDING",
    target: parsed.data.id,
    meta: { isTrending: parsed.data.isTrending },
  });
  revalidatePath("/admin/tags");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const deleteSchema = z.object({ id: z.string() });

export async function deleteTagAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const count = await prisma.articleTag.count({
    where: { tagId: parsed.data.id },
  });
  if (count > 0) {
    return {
      ok: false as const,
      error: `Cannot delete — used by ${count} article${count === 1 ? "" : "s"}.`,
    };
  }
  await prisma.tag.delete({ where: { id: parsed.data.id } });
  await logAudit({
    actorId: session.user.id,
    action: "TAG_DELETE",
    target: parsed.data.id,
  });
  revalidatePath("/admin/tags");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const setArticleTagsSchema = z.object({
  articleId: z.string(),
  tagIds: z.array(z.string()).max(50),
});

export async function setArticleTagsAction(raw: unknown) {
  const session = await requireRole(ADMIN_ROLES);
  const parsed = setArticleTagsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { articleId, tagIds } = parsed.data;
  await prisma.$transaction([
    prisma.articleTag.deleteMany({ where: { articleId } }),
    ...(tagIds.length > 0
      ? [
          prisma.articleTag.createMany({
            data: tagIds.map((tagId) => ({ articleId, tagId })),
          }),
        ]
      : []),
  ]);
  await logAudit({
    actorId: session.user.id,
    action: "ARTICLE_TAGS_SET",
    target: articleId,
    meta: { count: tagIds.length },
  });
  revalidatePath(`/admin/articles/${articleId}/edit`);
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { routing } from "@/i18n/routing";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const upsertModuleSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(slugRegex, "Use lowercase letters, digits and dashes only"),
  icon: z.string().max(40).optional().or(z.literal("")),
  // sortOrder is now managed by the ▲▼ reorder action — the form no longer
  // submits it. Optional here so existing callers can still pass a value.
  sortOrder: z.number().int().nonnegative().optional(),
  isPublic: z.boolean().default(true),
});

export async function upsertModuleAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = upsertModuleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input" };
  }

  const baseData = {
    slug: parsed.data.slug,
    icon: parsed.data.icon || null,
    isPublic: parsed.data.isPublic,
  };

  let id = parsed.data.id;
  if (id) {
    await prisma.module.update({
      where: { id },
      data: {
        ...baseData,
        ...(parsed.data.sortOrder !== undefined
          ? { sortOrder: parsed.data.sortOrder }
          : {}),
      },
    });
    await logAudit({
      actorId: session.user.id,
      action: "MODULE_UPDATE",
      target: id,
    });
  } else {
    const exists = await prisma.module.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (exists)
      return { ok: false as const, error: "Slug already exists" };
    // Append-to-end: new modules get max+10 so they don't tie with existing ones.
    let sortOrder = parsed.data.sortOrder;
    if (sortOrder === undefined) {
      const maxRow = await prisma.module.aggregate({
        _max: { sortOrder: true },
      });
      sortOrder = ((maxRow._max.sortOrder as number | null) ?? -10) + 10;
    }
    const created = await prisma.module.create({
      data: { ...baseData, sortOrder },
    });
    id = created.id;
    await logAudit({
      actorId: session.user.id,
      action: "MODULE_CREATE",
      target: id,
    });
  }
  revalidatePath("/admin/modules");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const, id };
}

const translationSchema = z.object({
  moduleId: z.string(),
  locale: z.enum(routing.locales as unknown as [string, ...string[]]),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  metaTitle: z.string().max(160).optional().or(z.literal("")),
  metaDescription: z.string().max(280).optional().or(z.literal("")),
});

export async function upsertModuleTranslationAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = translationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input" };
  }
  await prisma.moduleTranslation.upsert({
    where: {
      moduleId_locale: {
        moduleId: parsed.data.moduleId,
        locale: parsed.data.locale,
      },
    },
    update: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      metaTitle: parsed.data.metaTitle || null,
      metaDescription: parsed.data.metaDescription || null,
    },
    create: {
      moduleId: parsed.data.moduleId,
      locale: parsed.data.locale,
      name: parsed.data.name,
      description: parsed.data.description || null,
      metaTitle: parsed.data.metaTitle || null,
      metaDescription: parsed.data.metaDescription || null,
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "MODULE_TRANSLATION_UPSERT",
    target: parsed.data.moduleId,
    meta: { locale: parsed.data.locale },
  });
  revalidatePath(`/admin/modules/${parsed.data.moduleId}`);
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

const deleteSchema = z.object({ id: z.string() });
export async function deleteModuleAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const count = await prisma.article.count({
    where: { moduleId: parsed.data.id },
  });
  if (count > 0) {
    return {
      ok: false as const,
      error: `Cannot delete — ${count} article${count === 1 ? "" : "s"} still in this module.`,
    };
  }
  await prisma.module.delete({ where: { id: parsed.data.id } });
  await logAudit({
    actorId: session.user.id,
    action: "MODULE_DELETE",
    target: parsed.data.id,
  });
  revalidatePath("/admin/modules");
  return { ok: true as const };
}

const reorderSchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});

/**
 * Swap a module with its neighbour (by sortOrder asc). Re-sequences ALL
 * modules to `i * 10` after the swap so ordering stays clean and gaps
 * stay open for future inserts.
 */
export async function reorderModuleAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const all = await prisma.module.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const idx = all.findIndex((m) => m.id === parsed.data.id);
  if (idx === -1) return { ok: false as const, error: "Module not found" };
  const swapIdx = parsed.data.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) {
    return { ok: false as const, error: "Already at edge" };
  }

  const next = [...all];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

  await prisma.$transaction(
    next.map((m, i) =>
      prisma.module.update({
        where: { id: m.id },
        data: { sortOrder: i * 10 },
      }),
    ),
  );
  await logAudit({
    actorId: session.user.id,
    action: "MODULE_REORDER",
    target: parsed.data.id,
    meta: { direction: parsed.data.direction },
  });
  revalidatePath("/admin/modules");
  revalidatePath("/[locale]/academy", "layout");
  return { ok: true as const };
}

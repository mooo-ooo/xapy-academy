"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import GithubSlugger from "github-slugger";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateRandomPassword, hashPassword } from "@/lib/password";
import { routing } from "@/i18n/routing";
import { createImpersonationToken } from "@/lib/auth";

const ASSIGNABLE_ROLES = ["USER", "CTV"] as const;

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional().or(z.literal("")),
  role: z.enum(ASSIGNABLE_ROLES),
  preferredLang: z.enum(routing.locales as unknown as [string, ...string[]]),
});

export type CreateUserResult =
  | { ok: true; email: string; password: string; userId: string }
  | { ok: false; error: string };

export async function createUserAction(
  raw: unknown,
): Promise<CreateUserResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) return { ok: false, error: "Email already in use" };

  const password = generateRandomPassword();
  const hash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      role: parsed.data.role,
      preferredLang: parsed.data.preferredLang,
      passwordHash: hash,
      createdById: session.user.id,
      isActive: true,
    },
  });

  await logAudit({
    actorId: session.user.id,
    action: "USER_CREATE",
    target: user.id,
    meta: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/users");
  return { ok: true, email: user.email, password, userId: user.id };
}

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function updateUserRoleAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = updateRoleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  if (parsed.data.userId === session.user.id) {
    return { ok: false as const, error: "You can't change your own role." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!target) return { ok: false as const, error: "User not found" };
  if (target.role === "ADMIN") {
    return { ok: false as const, error: "Admin role cannot be changed." };
  }

  const previous = target.role;
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER_ROLE_CHANGE",
    target: parsed.data.userId,
    meta: { previous, next: parsed.data.role },
  });
  revalidatePath("/admin/users");
  return { ok: true as const };
}

const toggleActiveSchema = z.object({
  userId: z.string(),
  isActive: z.boolean(),
});

export async function toggleUserActiveAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = toggleActiveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  if (parsed.data.userId === session.user.id && !parsed.data.isActive) {
    return { ok: false as const, error: "You can't deactivate yourself." };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { isActive: parsed.data.isActive },
  });
  await logAudit({
    actorId: session.user.id,
    action: parsed.data.isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
    target: parsed.data.userId,
  });
  revalidatePath("/admin/users");
  return { ok: true as const };
}

const resetPasswordSchema = z.object({ userId: z.string() });

export type ResetPasswordResult =
  | { ok: true; password: string; userId: string }
  | { ok: false; error: string };

export async function resetUserPasswordAction(
  raw: unknown,
): Promise<ResetPasswordResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const newPassword = generateRandomPassword();
  const hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash: hash },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER_PASSWORD_RESET",
    target: parsed.data.userId,
  });
  revalidatePath("/admin/users");
  return { ok: true, password: newPassword, userId: parsed.data.userId };
}

const updateLangSchema = z.object({
  userId: z.string(),
  preferredLang: z.enum(routing.locales as unknown as [string, ...string[]]),
});

const deleteSchema = z.object({ userId: z.string() });

export async function deleteUserAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  if (parsed.data.userId === session.user.id) {
    return { ok: false as const, error: "You can't delete yourself." };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false as const, error: "User not found" };
  if (target.role === "ADMIN") {
    return { ok: false as const, error: "Admin account cannot be deleted." };
  }

  try {
    await prisma.user.delete({ where: { id: target.id } });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "P2003"
    ) {
      return {
        ok: false as const,
        error: "USER_HAS_REFERENCES",
      };
    }
    throw err;
  }

  await logAudit({
    actorId: session.user.id,
    action: "USER_DELETE",
    target: target.id,
    meta: { email: target.email, role: target.role },
  });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export type ImpersonateResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export async function impersonateUserAction(
  userId: string,
): Promise<ImpersonateResult> {
  const session = await requireRole(["ADMIN"]);

  if (typeof userId !== "string" || userId.length === 0) {
    return { ok: false, error: "Invalid input" };
  }
  if (userId === session.user.id) {
    return { ok: false, error: "Cannot impersonate yourself" };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!target) return { ok: false, error: "User not found" };
  if (!target.isActive) return { ok: false, error: "User is inactive" };

  await logAudit({
    actorId: session.user.id,
    action: "USER_IMPERSONATE",
    target: target.id,
    meta: { email: target.email, role: target.role },
  });

  const token = createImpersonationToken(target.id);
  return { ok: true, token };
}

/** Slugify + guarantee uniqueness across users (excluding `excludeId`). */
async function ensureUniqueAuthorSlug(
  base: string,
  excludeId: string,
): Promise<string> {
  const normalized = new GithubSlugger().slug(base) || "author";
  let candidate = normalized;
  let n = 1;
  // Bounded loop — degenerate collisions are vanishingly unlikely.
  while (n < 100) {
    const clash = await prisma.user.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
    n += 1;
    candidate = `${normalized}-${n}`;
  }
  return `${normalized}-${excludeId.slice(0, 6)}`;
}

const authorProfileSchema = z.object({
  userId: z.string(),
  slug: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(2000).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  sameAs: z.array(z.string().trim().url().max(300)).max(20).optional(),
  knowsAbout: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

export type AuthorProfileResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function updateAuthorProfileAction(
  raw: unknown,
): Promise<AuthorProfileResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = authorProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { userId, bio, jobTitle, sameAs, knowsAbout } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, slug: true },
  });
  if (!target) return { ok: false, error: "User not found" };

  // Explicit slug wins; else keep existing; else derive from name/email.
  const slugBase =
    parsed.data.slug?.trim() ||
    target.slug ||
    target.name ||
    target.email.split("@")[0];
  const slug = await ensureUniqueAuthorSlug(slugBase, userId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      slug,
      bio: bio?.length ? bio : null,
      jobTitle: jobTitle?.length ? jobTitle : null,
      sameAs: sameAs && sameAs.length > 0 ? sameAs : Prisma.DbNull,
      knowsAbout:
        knowsAbout && knowsAbout.length > 0 ? knowsAbout : Prisma.DbNull,
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER_AUTHOR_PROFILE",
    target: userId,
    meta: { slug },
  });
  revalidatePath("/admin/users");
  // Public author page across all locales.
  revalidatePath("/[locale]/authors/[slug]", "page");
  return { ok: true, slug };
}

export async function updatePreferredLangAction(raw: unknown) {
  const session = await requireRole(["ADMIN"]);
  const parsed = updateLangSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { preferredLang: true },
  });
  if (!target) return { ok: false as const, error: "User not found" };

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { preferredLang: parsed.data.preferredLang },
  });
  await logAudit({
    actorId: session.user.id,
    action: "USER_LANG_CHANGE",
    target: parsed.data.userId,
    meta: { previous: target.preferredLang, next: parsed.data.preferredLang },
  });
  revalidatePath("/admin/users");
  return { ok: true as const };
}

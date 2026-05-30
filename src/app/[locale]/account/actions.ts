"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { routing } from "@/i18n/routing";

const profileSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  image: z
    .string()
    .trim()
    .max(2048)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional(),
  preferredLang: z.enum(routing.locales as unknown as [string, ...string[]]),
});

export type ProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfileAction(raw: unknown): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: (parsed.data.name || "").trim() || null,
      image: parsed.data.image ?? null,
      preferredLang: parsed.data.preferredLang,
    },
  });

  revalidatePath("/account");
  return { ok: true };
}

const passwordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8).max(200),
    confirm: z.string().min(8).max(200),
  })
  .refine((d) => d.next === d.confirm, {
    path: ["confirm"],
    message: "MISMATCH",
  });

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: "MISMATCH" | "WEAK" | "WRONG_CURRENT" | "OAUTH_ONLY" | "GENERIC" };

export async function changePasswordAction(
  raw: unknown,
): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "GENERIC" };

  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    const mismatch = parsed.error.issues.find((i) => i.message === "MISMATCH");
    if (mismatch) return { ok: false, error: "MISMATCH" };
    return { ok: false, error: "WEAK" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "GENERIC" };
  if (!user.passwordHash) return { ok: false, error: "OAUTH_ONLY" };

  const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!ok) return { ok: false, error: "WRONG_CURRENT" };

  const hash = await bcrypt.hash(parsed.data.next, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash },
  });
  return { ok: true };
}

"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { logAudit } from "@/lib/audit";

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  name: z.string().max(120).optional().or(z.literal("")),
  locale: z
    .enum(routing.locales as unknown as [string, ...string[]])
    .optional(),
});

export type RegisterResult =
  | { ok: true; email: string; requiresApproval: boolean }
  | { ok: false; error: "DISABLED" | "DUPLICATE" | "INVALID" };

export async function registerAction(raw: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  const settings = await prisma.siteSetting.findUnique({
    where: { id: 1 },
    select: { allowSelfSignup: true, signupRequiresApproval: true },
  });
  if (settings && !settings.allowSelfSignup) {
    return { ok: false, error: "DISABLED" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "DUPLICATE" };

  const requireApproval = settings?.signupRequiresApproval ?? true;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      name: (parsed.data.name || "").trim() || null,
      passwordHash,
      role: "USER",
      preferredLang: parsed.data.locale ?? "en",
      isActive: !requireApproval,
      // For credentials signup we don't have a verified email yet —
      // admin approval (or future email-verify flow) sets this.
      emailVerified: null,
    },
    select: { id: true, email: true },
  });

  await logAudit({
    actorId: user.id,
    action: "USER_REGISTER",
    target: user.id,
    meta: { email: user.email, self: true },
  });

  return { ok: true, email: user.email, requiresApproval: requireApproval };
}

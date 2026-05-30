import { prisma } from "@/lib/db";

/**
 * Append-only audit trail. Call from every mutating server action.
 * Never throws — audit failure must not block the user's action.
 */
export async function logAudit(input: {
  actorId: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        target: input.target ?? null,
        meta: input.meta ? JSON.parse(JSON.stringify(input.meta)) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write:", err);
  }
}

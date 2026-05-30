import { auth, type AppRole } from "@/lib/auth";

/**
 * Throw if no session or role mismatch. Use inside server actions
 * and route handlers as the first line of defense.
 *
 * Usage:
 *   await requireRole(["ADMIN"]);
 *   await requireRole(["ADMIN", "CTV"]);
 */
export async function requireRole(allowed: readonly AppRole[]) {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError("Not authenticated");
  }
  if (!allowed.includes(session.user.role)) {
    throw new ForbiddenError(
      `Role ${session.user.role} not allowed; need one of ${allowed.join(", ")}`,
    );
  }
  return session;
}

/** Boolean variant — returns null instead of throwing. */
export async function getSessionWithRole(allowed?: readonly AppRole[]) {
  const session = await auth();
  if (!session?.user) return null;
  if (allowed && !allowed.includes(session.user.role)) return null;
  return session;
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Language access rule (PLAN.md §5).
 *
 * - Guest (no user)         → site.publicLocale, regardless of requested.
 * - Authenticated user      → requested (if supported), else preferredLang.
 *
 * This is the data-layer enforcement; middleware enforces the same at
 * URL level for guests so they never land on a forbidden locale path.
 */
export function resolveReadableLocale(
  user: { preferredLang: string } | null,
  requested: string,
  site: { publicLocale: string; supportedLocales: string[] },
): string {
  if (!user) return site.publicLocale;
  if (site.supportedLocales.includes(requested)) return requested;
  if (site.supportedLocales.includes(user.preferredLang))
    return user.preferredLang;
  return site.publicLocale;
}

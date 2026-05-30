import { cache } from "react";
import { auth } from "@/lib/auth";
import { getSiteSetting } from "@/lib/data/site";
import { resolveReadableLocale } from "@/lib/rbac";
import type { Locale } from "@/i18n/routing";

/**
 * Server-side resolver for "what locale can the current viewer read?"
 *
 * Implements PLAN §5 at the data layer:
 *   - Guest      → site.publicLocale (regardless of `requested`)
 *   - Authed     → `requested` if supported, else user.preferredLang.
 *
 * Cached per request so all data-fetches in a Server Component
 * tree share one auth() + getSiteSetting() round-trip.
 */
export const resolveLocaleForRequest = cache(async (requested: string) => {
  const [session, site] = await Promise.all([auth(), getSiteSetting()]);
  const effective = resolveReadableLocale(
    session?.user ? { preferredLang: session.user.preferredLang } : null,
    requested,
    site,
  ) as Locale;
  return {
    effective,
    requested: requested as Locale,
    isFallback: effective !== requested,
    isAuthenticated: !!session?.user,
    site,
  };
});

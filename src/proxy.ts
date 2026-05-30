import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. The
 * proxy runtime is Node-only in v16.
 *
 * Static i18n: `routing.locales` comes from `messages/*.json` via
 * `tools/sync-locales.ts` at build time. Public locale is configured via
 * the `PUBLIC_LOCALE` env var (defaults to `en`).
 */

const intl = createIntlMiddleware(routing);

const PUBLIC_LOCALE = (process.env.PUBLIC_LOCALE ?? "en") as
  | (typeof routing.locales)[number];

const PROTECTED_PREFIXES = ["/admin"];

function isProtected(pathnameWithoutLocale: string) {
  return PROTECTED_PREFIXES.some(
    (p) =>
      pathnameWithoutLocale === p ||
      pathnameWithoutLocale.startsWith(`${p}/`),
  );
}

function stripLocale(pathname: string) {
  const segs = pathname.split("/");
  if (
    segs.length > 1 &&
    (routing.locales as readonly string[]).includes(segs[1])
  ) {
    return { locale: segs[1], rest: "/" + segs.slice(2).join("/") };
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

export const proxy = auth(async (req) => {
  // Run next-intl first so we get its canonical response (sets locale cookie,
  // handles default-locale redirects, etc.)
  const intlResponse = intl(req as unknown as NextRequest);

  const { pathname, search } = req.nextUrl;
  const { locale, rest } = stripLocale(pathname);
  const session = req.auth;

  // 1. Guard admin routes — must be authenticated
  if (isProtected(rest)) {
    if (!session) {
      const loginUrl = new URL(`/${locale}/login`, req.nextUrl);
      loginUrl.searchParams.set("next", pathname + (search ?? ""));
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Language access rule (PLAN §5):
  //    Guests are forced onto PUBLIC_LOCALE. Authenticated users can
  //    browse any supported locale freely.
  if (
    !session &&
    (routing.locales as readonly string[]).includes(locale) &&
    locale !== PUBLIC_LOCALE
  ) {
    const url = new URL(req.nextUrl);
    url.pathname = `/${PUBLIC_LOCALE}${rest}`;
    return NextResponse.redirect(url);
  }

  return intlResponse;
});

export default proxy;

export const config = {
  // Skip Next internals, API, well-known files with extensions, and the
  // SEO/OG routes that live at the site root (no locale prefix).
  matcher: [
    "/((?!api|_next|_vercel|opengraph-image|llms\\.txt|sitemap\\.xml|robots\\.txt|.*\\..*).*)",
  ],
};

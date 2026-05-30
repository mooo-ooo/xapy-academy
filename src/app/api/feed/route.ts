import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import {
  listLatestArticlesPage,
  listPublishedArticlesInModulePage,
  type ArticleListItem,
} from "@/lib/data/articles";
import { searchPublishedArticlesPage } from "@/lib/data/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampLimit(raw: string | null): number {
  const n = Number(raw ?? 12);
  if (!Number.isFinite(n)) return 12;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

function serializeArticle(item: ArticleListItem) {
  return { ...item, publishedAt: item.publishedAt?.toISOString() ?? null };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const localeParam = sp.get("locale");

  if (!localeParam || !hasLocale(routing.locales, localeParam)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }
  const locale = localeParam as Locale;
  const limit = clampLimit(sp.get("limit"));

  if (type === "latest") {
    const page = await listLatestArticlesPage(locale, {
      cursor: sp.get("cursor"),
      limit,
    });
    return NextResponse.json({
      items: page.items.map(serializeArticle),
      nextCursor: page.nextCursor,
    });
  }

  if (type === "module") {
    const moduleId = sp.get("moduleId");
    if (!moduleId) {
      return NextResponse.json({ error: "moduleId required" }, { status: 400 });
    }
    const page = await listPublishedArticlesInModulePage(moduleId, locale, {
      cursor: sp.get("cursor"),
      limit,
    });
    return NextResponse.json({
      items: page.items.map(serializeArticle),
      nextCursor: page.nextCursor,
    });
  }

  if (type === "search") {
    const q = (sp.get("q") ?? "").trim();
    if (!q) {
      return NextResponse.json({ hits: [], nextOffset: null });
    }
    const offsetRaw = Number(sp.get("offset") ?? 0);
    const offset = Number.isFinite(offsetRaw)
      ? Math.max(0, Math.floor(offsetRaw))
      : 0;
    const page = await searchPublishedArticlesPage(q, locale, {
      offset,
      limit,
    });
    return NextResponse.json({
      hits: page.hits.map((h) => ({
        ...h,
        publishedAt: h.publishedAt?.toISOString() ?? null,
      })),
      nextOffset: page.nextOffset,
    });
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 });
}

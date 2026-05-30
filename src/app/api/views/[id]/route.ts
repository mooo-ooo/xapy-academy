import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Common bot / link-preview / scraper user-agents. We don't want
 * Slack's unfurl or Googlebot's crawl bumping the view count — only
 * real people clicking the page.
 *
 * Kept conservative: matches the substring case-insensitively, and
 * leans on the well-known bot tokens these crawlers self-identify with.
 */
const BOT_RE =
  /bot|crawl|spider|fetcher|preview|monitor|whatsapp|telegram|facebookexternalhit|slackbot|twitterbot|linkedinbot|googlebot|bingbot|yahoo|duckduck|pinterest|baidu|yandex|sogou|headless|httpclient|axios|curl|wget|libwww|python-requests|node-fetch|go-http-client/i;

function isLikelyBot(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua) return true; // No UA at all = almost always a bot
  return BOT_RE.test(ua);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || typeof id !== "string" || id.length > 100) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  if (isLikelyBot(req)) {
    // Silent 204 — don't reveal which UAs we filter.
    return new NextResponse(null, { status: 204 });
  }

  // Atomic increment + per-user history upsert. Both wrapped in
  // try/catch — view tracking is best-effort and must never throw.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  try {
    if (userId) {
      await prisma.$transaction([
        prisma.article.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        }),
        prisma.articleView.upsert({
          where: { userId_articleId: { userId, articleId: id } },
          create: { userId, articleId: id },
          update: { count: { increment: 1 }, viewedAt: new Date() },
        }),
      ]);
    } else {
      await prisma.article.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }
  } catch {
    // Article gone, slug renamed, FK miss — never block on tracking.
  }
  return new NextResponse(null, { status: 204 });
}

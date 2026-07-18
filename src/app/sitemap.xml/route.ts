import { getSitemapChildren, renderSitemapIndex } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const children = await getSitemapChildren();
  return new Response(renderSitemapIndex(children), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

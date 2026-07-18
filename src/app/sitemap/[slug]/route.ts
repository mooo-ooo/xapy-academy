import { buildChildUrls, renderUrlset } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clean = slug.endsWith(".xml") ? slug.slice(0, -4) : slug;
  const urls = await buildChildUrls(clean);
  if (urls === null) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(renderUrlset(urls), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

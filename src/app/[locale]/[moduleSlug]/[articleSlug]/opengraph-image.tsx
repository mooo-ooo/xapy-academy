import { ImageResponse } from "next/og";
import { loadArticleForReading } from "@/lib/data/articles";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { routing } from "@/i18n/routing";
import { loadOgFonts, OG_FONT_FAMILY, type OgFont } from "@/lib/og/fonts";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kiyotaka Academy article";

export default async function ArticleOg({
  params,
}: {
  params: Promise<{
    locale: string;
    moduleSlug: string;
    articleSlug: string;
  }>;
}) {
  const { locale, moduleSlug, articleSlug } = await params;
  const fonts = await loadOgFonts();
  if (!(routing.locales as readonly string[]).includes(locale)) {
    return fallback("Kiyotaka Academy", fonts);
  }
  const { effective } = await resolveLocaleForRequest(locale);
  const article = await loadArticleForReading(
    moduleSlug,
    articleSlug,
    effective,
  );
  if (!article) return fallback("Kiyotaka Academy", fonts);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: 72,
          background:
            "linear-gradient(135deg, #0e0d0d 0%, #171515 60%, #2a1208 100%)",
          color: "#e4e4e7",
          fontFamily: `'${OG_FONT_FAMILY}', sans-serif`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            letterSpacing: 0.6,
            color: "#a1a1aa",
          }}
        >
          <span style={{ color: "#ff6a00", fontWeight: 700 }}>k</span>
          <span style={{ fontWeight: 700, color: "#e4e4e7" }}>ACADEMY</span>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            fontSize: 18,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: "#10b981",
            marginBottom: 16,
          }}
        >
          {article.moduleName}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
            color: "#fafafa",
            maxWidth: "85%",
            display: "flex",
          }}
        >
          {article.title}
        </div>
        {article.excerpt && (
          <div
            style={{
              marginTop: 24,
              fontSize: 26,
              lineHeight: 1.4,
              color: "#a1a1aa",
              maxWidth: "80%",
              display: "flex",
            }}
          >
            {article.excerpt.slice(0, 160)}
          </div>
        )}
      </div>
    ),
    { ...size, fonts },
  );
}

function fallback(text: string, fonts: OgFont[]) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#0e0d0d",
          color: "#e4e4e7",
          fontSize: 80,
          fontWeight: 700,
          letterSpacing: -2,
          fontFamily: `'${OG_FONT_FAMILY}', sans-serif`,
        }}
      >
        {text}
      </div>
    ),
    { ...size, fonts },
  );
}

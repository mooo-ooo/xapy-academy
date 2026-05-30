import { ImageResponse } from "next/og";
import { loadOgFonts, OG_FONT_FAMILY } from "@/lib/og/fonts";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kiyotaka Academy";

export default async function SiteOg() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 80,
          background:
            "radial-gradient(circle at 20% 30%, rgba(16,185,129,0.12) 0%, transparent 50%), linear-gradient(135deg, #0e0d0d 0%, #171515 60%, #2a1208 100%)",
          color: "#e4e4e7",
          fontFamily: `'${OG_FONT_FAMILY}', sans-serif`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 28,
            letterSpacing: 0.6,
          }}
        >
          <span style={{ color: "#ff6a00", fontWeight: 700 }}>k</span>
          <span style={{ fontWeight: 700 }}>ACADEMY</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 86,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 0.95,
              display: "flex",
            }}
          >
            Kiyotaka Academy
          </div>
          <div style={{ fontSize: 32, color: "#a1a1aa", display: "flex" }}>
            Institutional-grade education for the modern trader.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

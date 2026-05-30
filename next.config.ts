import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ship the OG fonts (read via fs in lib/og/fonts.ts) with the traced
  // output so the ImageResponse routes find them in standalone/serverless.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/lib/og/fonts/*.ttf"],
    "/[locale]/academy/[moduleSlug]/[articleSlug]/opengraph-image": [
      "./src/lib/og/fonts/*.ttf",
    ],
  },
};

export default withNextIntl(nextConfig);

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { WebVitalsReporter } from "@/components/web-vitals";
import {
  absoluteUrl,
  buildGraph,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  siteOrigin,
  withXDefault,
} from "@/lib/seo";
import { getEnabledLocales, getSiteSetting } from "@/lib/data/site";
import "../globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Browser-chrome tint — matches the dark-default surface, light when toggled.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0d0d" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [t, site, enabled] = await Promise.all([
    getTranslations({ locale, namespace: "site" }),
    getSiteSetting(),
    getEnabledLocales(),
  ]);
  // Locale exists in messages/*.json (passed hasLocale) but the admin
  // has not enabled it for the public site — 404 so SEO doesn't pick
  // up parked translations.
  if (!enabled.includes(locale)) notFound();
  const title = site.siteName || t("title");
  const description =
    site.defaultMetaDescription ?? site.tagline ?? t("tagline");
  const icons = site.faviconUrl ? { icon: site.faviconUrl } : undefined;
  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
    icons,
    // Public reading pages: let Search + AI surfaces use the full snippet
    // and a large image preview (max-snippet/max-image-preview gate how much
    // content may feed AI Overviews / AI Mode). Child pages that set
    // robots:{index:false} (search/account/login/register) override this.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: absoluteUrl(`/${locale}/academy`),
      languages: withXDefault(
        Object.fromEntries(
          enabled.map((l) => [l, absoluteUrl(`/${l}/academy`)]),
        ),
        site.publicLocale,
      ),
    },
    openGraph: {
      siteName: title,
      type: "website",
      locale,
      images: site.defaultOgImageUrl ? [site.defaultOgImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: site.twitterHandle ?? undefined,
      creator: site.twitterHandle ?? undefined,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const enabled = await getEnabledLocales();
  if (!enabled.includes(locale)) notFound();
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const initialTheme: "dark" | "light" =
    themeCookie === "light" ? "light" : "dark";

  const [t, site] = await Promise.all([
    getTranslations({ locale, namespace: "site" }),
    getSiteSetting(),
  ]);
  const siteName = site.siteName || t("title");
  const description =
    site.defaultMetaDescription ?? site.tagline ?? t("tagline");
  const websiteJsonLd = buildWebSiteJsonLd({
    siteName,
    description,
    supportedLocales: site.supportedLocales,
  });
  const orgJsonLd = buildOrganizationJsonLd({
    siteName,
    description,
    logoUrl: site.logoUrl,
    contactEmail: site.contactEmail,
    twitterHandle: site.twitterHandle,
    // Core topics the Academy covers — topical-authority signal (knowsAbout).
    knowsAbout: [
      "Order flow analysis",
      "Footprint charts",
      "Volume profile",
      "Market profile (TPO)",
      "VWAP",
      "Liquidity",
      "Market structure",
      "Technical analysis",
      "Trading psychology",
    ],
  });

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased${initialTheme === "dark" ? " dark" : ""}`}
      style={{ colorScheme: initialTheme }}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd data={buildGraph([orgJsonLd, websiteJsonLd])} />
        <NextIntlClientProvider>
          <Providers initialTheme={initialTheme}>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer locale={locale} />
            <WebVitalsReporter />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

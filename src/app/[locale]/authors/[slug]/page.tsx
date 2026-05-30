import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ArticleCard } from "@/components/academy/article-card";
import { JsonLd } from "@/components/seo/json-ld";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import { getAuthorBySlug } from "@/lib/data/authors";
import { listPublishedArticlesByAuthor } from "@/lib/data/articles";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildGraph,
  buildPersonJsonLd,
  buildProfilePageJsonLd,
  withXDefault,
} from "@/lib/seo";

export const revalidate = 300;

type RouteParams = { locale: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { effective, site } = await resolveLocaleForRequest(locale);
  const author = await getAuthorBySlug(slug);
  if (!author) return {};
  const t = await getTranslations({ locale: effective, namespace: "authors" });

  const title = author.jobTitle
    ? `${author.name} — ${author.jobTitle}`
    : author.name;
  const description =
    author.bio ?? t("metaDescription", { name: author.name, site: site.siteName });
  const canonical = absoluteUrl(`/${effective}/authors/${author.slug}`);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: withXDefault(
        Object.fromEntries(
          site.supportedLocales.map((l) => [
            l,
            absoluteUrl(`/${l}/authors/${author.slug}`),
          ]),
        ),
        site.publicLocale,
      ),
    },
    openGraph: {
      type: "profile",
      locale: effective,
      title,
      description,
      url: canonical,
      images: author.image ? [author.image] : undefined,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { effective } = await resolveLocaleForRequest(locale);
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const [articles, t] = await Promise.all([
    listPublishedArticlesByAuthor(author.id, effective),
    getTranslations({ locale: effective, namespace: "authors" }),
  ]);

  const authorPath = `/${effective}/authors/${author.slug}`;
  const authorUrl = absoluteUrl(authorPath);
  const personJsonLd = buildPersonJsonLd({
    name: author.name,
    slug: author.slug,
    url: authorUrl,
    description: author.bio,
    image: author.image,
    jobTitle: author.jobTitle,
    sameAs: author.sameAs,
    knowsAbout: author.knowsAbout,
    worksForOrg: true,
  });
  const profileJsonLd = buildProfilePageJsonLd({
    url: authorUrl,
    inLanguage: effective,
    person: personJsonLd,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: "Academy", url: `/${effective}/academy` },
      { name: author.name, url: authorPath },
    ],
    { id: `${authorUrl}#breadcrumb` },
  );

  const initials = author.name.slice(0, 1).toUpperCase();

  return (
    <div>
      <JsonLd data={buildGraph([profileJsonLd, breadcrumbJsonLd])} />

      <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-24">
        <Link
          href="/academy"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        >
          <ArrowLeft size={14} />
          Academy
        </Link>

        <header className="flex flex-col gap-5 border-b border-[hsl(var(--border))] pb-10 sm:flex-row sm:items-start sm:gap-6">
          {author.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.image}
              alt={author.name}
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold uppercase text-white"
              style={{
                backgroundImage:
                  "linear-gradient(to right bottom, rgb(59, 130, 246), rgb(139, 92, 246))",
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))] md:text-4xl">
              {author.name}
            </h1>
            {author.jobTitle && (
              <p className="mt-1 text-sm font-medium text-[hsl(var(--accent-emerald))]">
                {author.jobTitle}
              </p>
            )}
            {author.bio && (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
                {author.bio}
              </p>
            )}

            {author.knowsAbout.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
                  {t("topics")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {author.knowsAbout.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-xs text-[hsl(var(--foreground))]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {author.sameAs.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
                  {t("links")}
                </p>
                <div className="flex flex-wrap gap-3">
                  {author.sameAs.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                    >
                      <ExternalLink size={13} />
                      {hostnameOf(url)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="mt-10">
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            {t("articlesHeading", { name: author.name })}
          </h2>
          {articles.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t("noArticles")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} moduleSlug={a.moduleSlug} article={a} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

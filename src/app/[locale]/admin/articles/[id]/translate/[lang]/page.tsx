import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminLevel } from "@/lib/roles";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TranslationEditor } from "./translation-editor";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function TranslatePage({
  params,
}: {
  params: Promise<{ locale: string; id: string; lang: string }>;
}) {
  const { locale, id, lang } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.articles" });

  const session = (await auth())!;

  if (!(routing.locales as readonly string[]).includes(lang)) notFound();

  const article = await prisma.article.findUnique({
    where: { id },
    include: { translations: true, module: true },
  });
  if (!article) notFound();
  if (lang === article.sourceLocale) {
    redirect(`/${locale}/admin/articles/${id}/edit`);
  }

  const source = article.translations.find(
    (t) => t.locale === article.sourceLocale,
  );
  const target = article.translations.find((t) => t.locale === lang);
  if (!source) notFound();
  if (!target) {
    // No row yet — admin must assign first.
    redirect(`/${locale}/admin/articles/${id}/edit`);
  }

  // CTV may only translate when assigned. Admin always may.
  if (
    session.user.role === "CTV" &&
    target.translatorId !== session.user.id
  ) {
    redirect(`/${locale}/admin/articles`);
  }

  const isStale = target.basedOnSourceVersion < article.sourceVersion;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/admin/articles"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToArticles")}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {t("translate.title", { lang: lang.toUpperCase() })}
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {t("translate.sourceMeta", {
              locale: article.sourceLocale.toUpperCase(),
              version: article.sourceVersion,
            })}{" "}
            {isStale && (
              <span className="ml-2 text-amber-300">
                {t("translate.staleSource")}
              </span>
            )}
          </p>
        </div>
        <Badge
          tone={
            target.status === "PUBLISHED"
              ? "published"
              : target.status === "REVIEW"
                ? "review"
                : target.status === "IN_PROGRESS"
                  ? "in_progress"
                  : "pending"
          }
        >
          {target.status}
        </Badge>
      </header>

      <TranslationEditor
        articleId={article.id}
        locale={lang}
        canPublish={isAdminLevel(session.user.role)}
        source={{
          title: source.title,
          excerpt: source.excerpt ?? "",
          bodyMdx: source.bodyMdx,
          metaTitle: source.metaTitle ?? "",
          metaDescription: source.metaDescription ?? "",
          slug: source.slug,
        }}
        initial={{
          slug: target.slug,
          title: target.title,
          excerpt: target.excerpt ?? "",
          bodyMdx: target.bodyMdx,
          metaTitle: target.metaTitle ?? "",
          metaDescription: target.metaDescription ?? "",
          ogImage: target.ogImage ?? "",
        }}
        currentStatus={target.status}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TranslatorAssignmentPanel } from "./translator-assignment-panel";
import { ArticleTagsEditor } from "@/components/admin/article-tags-editor";
import { ArticleEditTabs } from "./article-edit-tabs";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.articles" });

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      module: {
        select: {
          slug: true,
          translations: { where: { locale: "en" }, select: { name: true } },
        },
      },
      translations: {
        include: {
          translator: { select: { id: true, name: true, email: true } },
        },
      },
      tags: { select: { tagId: true } },
    },
  });
  if (!article) notFound();

  const source = article.translations.find(
    (t) => t.locale === article.sourceLocale,
  );
  if (!source) notFound();

  const [ctvs, allTags] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["CTV", "ADMIN"] }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.tag.findMany({
      include: {
        translations: { where: { locale: "en" }, select: { name: true } },
      },
      orderBy: { slug: "asc" },
    }),
  ]);

  const tagOptions = allTags.map((tg) => ({
    id: tg.id,
    label: tg.translations[0]?.name ?? tg.slug,
  }));
  const selectedTagIds = article.tags.map((at) => at.tagId);

  const targetLocales = (routing.locales as readonly string[]).filter(
    (l) => l !== article.sourceLocale,
  );

  return (
    <div>
      <Link
        href="/admin/articles"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToArticles")}
      </Link>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {source.title}
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {t("edit.moduleMeta", {
              module:
                article.module.translations[0]?.name ?? article.module.slug,
              locale: article.sourceLocale.toUpperCase(),
              version: article.sourceVersion,
            })}
          </p>
        </div>
        <Badge
          tone={
            article.status === "PUBLISHED"
              ? "published"
              : article.status === "REVIEW"
                ? "review"
                : article.status === "ARCHIVED"
                  ? "archived"
                  : "draft"
          }
        >
          {article.status}
        </Badge>
      </header>

      <ArticleEditTabs
        articleId={article.id}
        status={article.status}
        source={{
          slug: source.slug,
          title: source.title,
          excerpt: source.excerpt ?? "",
          bodyMdx: source.bodyMdx,
          metaTitle: source.metaTitle ?? "",
          metaDescription: source.metaDescription ?? "",
          difficulty: article.difficulty,
          coverImage: article.coverImage ?? "",
          accentColor: article.accentColor ?? "",
          ogImage: source.ogImage ?? "",
        }}
        viewCount={article.viewCount}
        likeCount={article.likeCount}
        tagsContent={
          <ArticleTagsEditor
            articleId={article.id}
            options={tagOptions}
            initial={selectedTagIds}
          />
        }
        translationsContent={
          <TranslatorAssignmentPanel
            articleId={article.id}
            sourceLocale={article.sourceLocale}
            sourceVersion={article.sourceVersion}
            targetLocales={targetLocales}
            translations={article.translations.map((t) => ({
              locale: t.locale,
              status: t.status,
              slug: t.slug,
              translator: t.translator
                ? {
                    id: t.translator.id,
                    name: t.translator.name,
                    email: t.translator.email,
                  }
                : null,
              basedOnSourceVersion: t.basedOnSourceVersion,
            }))}
            ctvs={ctvs}
          />
        }
      />
    </div>
  );
}

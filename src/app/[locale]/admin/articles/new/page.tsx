import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { NewArticleForm } from "./new-article-form";

export const dynamic = "force-dynamic";

export default async function NewArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.articles" });

  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      translations: { where: { locale: "en" }, select: { name: true } },
    },
  });
  const locales = routing.locales as unknown as string[];

  return (
    <div>
      <Link
        href="/admin/articles"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToArticles")}
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
        {t("new.title")}
      </h1>
      <p className="mb-8 text-sm text-[hsl(var(--muted-foreground))]">
        {t("new.subtitle")}
      </p>
      <NewArticleForm
        modules={modules.map((m) => ({
          id: m.id,
          slug: m.slug,
          name: m.translations[0]?.name ?? m.slug,
        }))}
        locales={locales}
      />
    </div>
  );
}

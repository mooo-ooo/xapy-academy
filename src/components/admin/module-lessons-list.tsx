import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonReorder } from "@/components/admin/lesson-reorder";

function statusTone(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "published" as const;
    case "REVIEW":
      return "review" as const;
    case "ARCHIVED":
      return "archived" as const;
    default:
      return "draft" as const;
  }
}

export async function ModuleLessonsList({
  moduleId,
  locale,
}: {
  moduleId: string;
  locale: string;
}) {
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "admin.modules.lessons" }),
    getTranslations({ locale, namespace: "admin.common" }),
  ]);

  const articles = await prisma.article.findMany({
    where: { moduleId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      sourceLocale: true,
      translations: { select: { locale: true, title: true } },
    },
  });

  if (articles.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {t("empty")}
      </p>
    );
  }

  return (
    <div>
      <p className="mb-5 text-sm text-[hsl(var(--muted-foreground))]">
        {t("hint")}
      </p>
      <ol className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {articles.map((a, i) => {
          const title =
            a.translations.find((tr) => tr.locale === a.sourceLocale)?.title ??
            a.translations[0]?.title ??
            tCommon("untitled");
          return (
            <li
              key={a.id}
              className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4 py-3 last:border-0 hover:bg-white/[0.02]"
            >
              <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-[hsl(var(--muted-foreground))]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[hsl(var(--foreground))]">
                  {title}
                </div>
              </div>
              <Badge tone={statusTone(a.status)}>{a.status}</Badge>
              <LessonReorder id={a.id} idx={i} total={articles.length} />
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/articles/${a.id}/edit`}>{t("edit")}</Link>
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { AdminTabs } from "@/components/admin/admin-tabs";

export const dynamic = "force-dynamic";

export default async function TranslationsInboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.translations" });

  const session = (await auth())!;
  const isAdmin = session.user.role === "ADMIN";

  const rows = await prisma.articleTranslation.findMany({
    where: isAdmin
      ? { status: { in: ["IN_PROGRESS", "REVIEW", "PENDING"] } }
      : { translatorId: session.user.id, status: { not: "PUBLISHED" } },
    orderBy: { updatedAt: "desc" },
    include: {
      article: {
        include: {
          module: {
            select: {
              slug: true,
              translations: {
                where: { locale: "en" },
                select: { name: true },
              },
            },
          },
          translations: {
            where: { locale: { not: "" } },
            select: {
              locale: true,
              title: true,
              translatorId: true,
            },
          },
        },
      },
      translator: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {isAdmin ? t("subtitleAdmin") : t("subtitleCtv")}
        </p>
      </header>

      <AdminTabs group="content" role={session.user.role} />

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-5 py-3 text-left font-medium">{t("table.article")}</th>
              <th className="px-5 py-3 text-left font-medium">{t("table.module")}</th>
              <th className="px-5 py-3 text-left font-medium">{t("table.locale")}</th>
              <th className="px-5 py-3 text-left font-medium">{t("table.status")}</th>
              {isAdmin && (
                <th className="px-5 py-3 text-left font-medium">{t("table.translator")}</th>
              )}
              <th className="px-5 py-3 text-right font-medium">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                >
                  {isAdmin ? t("emptyAdmin") : t("emptyCtv")}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const source = r.article.translations.find(
                  (tr) => tr.locale === r.article.sourceLocale,
                );
                const isStale =
                  r.basedOnSourceVersion < r.article.sourceVersion;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-[hsl(var(--foreground))]">
                        {source?.title ?? r.title}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("sourceMeta", {
                          locale: r.article.sourceLocale.toUpperCase(),
                          version: r.article.sourceVersion,
                        })}
                        {isStale && (
                          <span className="ml-2 text-amber-300">{t("stale")}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                      {r.article.module.translations[0]?.name ?? r.article.module.slug}
                    </td>
                    <td className="px-5 py-4 font-mono text-[hsl(var(--foreground))]">
                      {r.locale.toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          r.status === "REVIEW"
                            ? "review"
                            : r.status === "IN_PROGRESS"
                              ? "in_progress"
                              : "pending"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                        {r.translator
                          ? r.translator.name ?? r.translator.email
                          : "—"}
                      </td>
                    )}
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/articles/${r.article.id}/translate/${r.locale}`}
                        className="text-sm font-medium text-[hsl(var(--accent-emerald))] hover:underline"
                      >
                        {t("openLink")}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

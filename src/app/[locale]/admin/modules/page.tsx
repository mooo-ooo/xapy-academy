import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Link, redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ModuleReorder } from "@/components/admin/module-reorder";

export const dynamic = "force-dynamic";

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.modules" });
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect({ href: "/admin", locale });

  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { articles: true, translations: true } },
      translations: { select: { locale: true, name: true } },
    },
  });

  return (
    <div>
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/modules/new">
            <Plus size={14} /> {t("newModule")}
          </Link>
        </Button>
      </header>

      <AdminTabs group="content" role={session.user.role} />

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-5 py-3 text-left font-medium">{t("table.module")}</th>
              <th className="px-5 py-3 text-left font-medium">{t("table.translations")}</th>
              <th className="px-5 py-3 text-left font-medium">{t("table.articles")}</th>
              <th className="px-5 py-3 text-left font-medium">{t("table.visibility")}</th>
              <th className="px-5 py-3 text-right font-medium">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {modules.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                >
                  {t("empty")}
                </td>
              </tr>
            )}
            {modules.map((m, i) => {
              const en = m.translations.find((t) => t.locale === "en");
              return (
                <tr
                  key={m.id}
                  className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-[hsl(var(--foreground))]">
                      {en?.name ?? m.slug}
                    </div>
                    <div className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {m.slug}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      {m.translations.map((t) => (
                        <Badge key={t.locale} tone="neutral">
                          {t.locale.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                    {m._count.articles}
                  </td>
                  <td className="px-5 py-4">
                    {m.isPublic ? (
                      <Badge tone="published">{t("visibility.public")}</Badge>
                    ) : (
                      <Badge tone="archived">{t("visibility.hidden")}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <ModuleReorder
                        id={m.id}
                        idx={i}
                        total={modules.length}
                      />
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/modules/${m.id}`}>
                          {t("rowEdit")}
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

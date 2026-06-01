import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAdminLevel } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import {
  DataTable,
  type Column,
  type FilterDef,
} from "@/components/admin/data-table";
import { buildListQuery, type SearchParams } from "@/lib/admin/list-query";
import { AdminTabs } from "@/components/admin/admin-tabs";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;

export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "admin.articles" }),
    getTranslations({ locale, namespace: "admin.common" }),
  ]);

  const session = (await auth())!;
  const isAdmin = isAdminLevel(session.user.role);
  const sp = await searchParams;

  const lq = buildListQuery(sp, {
    sortable: ["updatedAt", "viewCount", "likeCount"],
    defaultSort: "updatedAt",
    pageSize: 20,
  });

  const statusFilter =
    typeof sp.status === "string" ? sp.status.toUpperCase() : "";
  const statusWhere =
    isAdmin && (STATUSES as readonly string[]).includes(statusFilter)
      ? { status: statusFilter as (typeof STATUSES)[number] }
      : {};
  const qWhere = lq.q
    ? { translations: { some: { title: { contains: lq.q } } } }
    : {};
  const where = isAdmin
    ? { ...statusWhere, ...qWhere }
    : {
        translations: { some: { translatorId: session.user.id } },
        ...qWhere,
      };

  const [articles, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      orderBy: lq.orderBy,
      skip: lq.skip,
      take: lq.take,
      include: {
        module: {
          select: {
            slug: true,
            translations: { where: { locale: "en" }, select: { name: true } },
          },
        },
        translations: {
          select: {
            locale: true,
            status: true,
            title: true,
            translatorId: true,
          },
        },
      },
    }),
    prisma.article.count({ where }),
  ]);

  const columns: Column[] = [
    { key: "title", header: t("table.title") },
    { key: "module", header: t("table.module") },
    { key: "status", header: t("table.status") },
    { key: "translations", header: t("table.translations") },
    { key: "viewCount", header: t("table.views"), sortable: true, align: "right" },
    { key: "likeCount", header: t("table.likes"), sortable: true, align: "right" },
    { key: "actions", header: t("table.actions"), align: "right" },
  ];

  const filters: FilterDef[] | undefined = isAdmin
    ? [{ param: "status", options: STATUSES.map((s) => ({ value: s, label: s })) }]
    : undefined;

  const tableParams: Record<string, string> = {
    ...lq.raw,
    sort: lq.sort,
    dir: lq.dir,
    page: String(lq.page),
  };

  return (
    <div>
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {isAdmin ? t("subtitleAdmin") : t("subtitleCtv")}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/admin/articles/new">
              <Plus size={14} /> {t("newArticle")}
            </Link>
          </Button>
        )}
      </header>

      <AdminTabs group="content" role={session.user.role} />

      <DataTable
        columns={columns}
        basePath="/admin/articles"
        params={tableParams}
        filters={filters}
        total={total}
        page={lq.page}
        pageSize={lq.pageSize}
        emptyLabel={t("empty")}
      >
        {articles.map((a) => {
          const source = a.translations.find((tr) => tr.locale === a.sourceLocale);
          return (
            <tr
              key={a.id}
              className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02]"
            >
              <td className="px-5 py-4">
                <div className="font-medium text-[hsl(var(--foreground))]">
                  {source?.title ?? tCommon("untitled")}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("sourceMeta", {
                    locale: a.sourceLocale.toUpperCase(),
                    version: a.sourceVersion,
                  })}
                </div>
              </td>
              <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                {a.module.translations[0]?.name ?? a.module.slug}
              </td>
              <td className="px-5 py-4">
                <Badge
                  tone={
                    a.status === "PUBLISHED"
                      ? "published"
                      : a.status === "REVIEW"
                        ? "review"
                        : a.status === "ARCHIVED"
                          ? "archived"
                          : "draft"
                  }
                >
                  {a.status}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {a.translations.map((tr) => (
                    <Badge
                      key={tr.locale}
                      tone={
                        tr.status === "PUBLISHED"
                          ? "published"
                          : tr.status === "REVIEW"
                            ? "review"
                            : tr.status === "IN_PROGRESS"
                              ? "in_progress"
                              : "pending"
                      }
                    >
                      {tr.locale.toUpperCase()} · {tr.status}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                {a.viewCount}
              </td>
              <td className="px-5 py-4 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                {a.likeCount}
              </td>
              <td className="px-5 py-4 text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={
                      isAdmin
                        ? `/admin/articles/${a.id}/edit`
                        : `/admin/articles/${a.id}/translate/${
                            a.translations.find(
                              (tr) =>
                                tr.translatorId === session.user.id &&
                                tr.locale !== a.sourceLocale,
                            )?.locale ?? a.sourceLocale
                          }`
                    }
                  >
                    {isAdmin ? t("rowEdit") : t("rowTranslate")}
                  </Link>
                </Button>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { buildListQuery, type SearchParams } from "@/lib/admin/list-query";
import {
  TrendingToggle,
  TagDeleteButton,
} from "@/components/admin/tag-row-actions";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.tags" });
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect({ href: "/admin", locale });
  const sp = await searchParams;

  const lq = buildListQuery(sp, {
    sortable: ["slug"],
    defaultSort: "slug",
    defaultDir: "asc",
    pageSize: 100,
  });
  const where = lq.q
    ? {
        OR: [
          { slug: { contains: lq.q } },
          { translations: { some: { name: { contains: lq.q } } } },
        ],
      }
    : {};

  const [tags, total] = await prisma.$transaction([
    prisma.tag.findMany({
      where,
      orderBy: lq.orderBy,
      include: {
        translations: true,
        _count: { select: { articles: true } },
      },
    }),
    prisma.tag.count({ where }),
  ]);

  const columns: Column[] = [
    { key: "slug", header: t("table.tag"), sortable: true },
    { key: "translations", header: t("table.translations") },
    { key: "articles", header: t("table.articles"), align: "right" },
    { key: "trending", header: t("table.trending") },
    { key: "actions", header: t("table.actions"), align: "right" },
  ];
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
            {t("subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tags/new">
            <Plus size={14} /> {t("newTag")}
          </Link>
        </Button>
      </header>

      <AdminTabs group="content" role={session.user.role} />

      <DataTable
        columns={columns}
        basePath="/admin/tags"
        params={tableParams}
        total={total}
        page={lq.page}
        pageSize={lq.pageSize}
        emptyLabel={t("empty")}
      >
        {tags.map((tag) => {
          const en = tag.translations.find((tr) => tr.locale === "en")?.name;
          return (
            <tr
              key={tag.id}
              className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02]"
            >
              <td className="px-5 py-4">
                <div className="font-medium text-[hsl(var(--foreground))]">
                  {en ?? tag.slug}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  {tag.slug}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {tag.translations.map((tr) => (
                    <Badge key={tr.locale} tone="user">
                      {tr.locale.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                {tag._count.articles}
              </td>
              <td className="px-5 py-4">
                <TrendingToggle id={tag.id} isTrending={tag.isTrending} />
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/tags/${tag.id}`}>{t("rowEdit")}</Link>
                  </Button>
                  <TagDeleteButton id={tag.id} />
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

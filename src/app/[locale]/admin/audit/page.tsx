import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { DataTable, type Column } from "@/components/admin/data-table";
import { buildListQuery, type SearchParams } from "@/lib/admin/list-query";
import { enrichAuditEntries } from "@/lib/data/audit-format";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = (await auth())!;
  if (session.user.role !== "ADMIN") redirect({ href: "/admin", locale });

  const [t, tActions] = await Promise.all([
    getTranslations({ locale, namespace: "admin.audit" }),
    getTranslations({ locale, namespace: "admin.audit.actions" }),
  ]);
  const actionLabel = (a: string) => {
    try {
      return (tActions as unknown as (k: string) => string)(a);
    } catch {
      // Defensive: unknown action codes (e.g. dynamic `TRANSLATION_${status}`
      // added later without an i18n key) fall back to the raw code.
      return a;
    }
  };

  const sp = await searchParams;
  const lq = buildListQuery(sp, {
    sortable: ["createdAt"],
    defaultSort: "createdAt",
    pageSize: 20,
  });

  const action = typeof sp.action === "string" ? sp.action : "";
  const where = {
    ...(action ? { action } : {}),
    ...(lq.q
      ? {
          OR: [
            { action: { contains: lq.q } },
            { target: { contains: lq.q } },
          ],
        }
      : {}),
  };

  const [logs, total, distinct] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: lq.orderBy,
      skip: lq.skip,
      take: lq.take,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
      take: 60,
    }),
  ]);

  const enriched = await enrichAuditEntries(logs, actionLabel);

  const columns: Column[] = [
    { key: "actor", header: t("table.actor") },
    { key: "action", header: t("table.action") },
    { key: "target", header: t("table.target") },
    { key: "meta", header: t("table.meta") },
    { key: "createdAt", header: t("table.time"), sortable: true, align: "right" },
  ];
  const tableParams: Record<string, string> = {
    ...lq.raw,
    sort: lq.sort,
    dir: lq.dir,
    page: String(lq.page),
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
          {t("subtitle")}
        </p>
      </header>

      <DataTable
        columns={columns}
        basePath="/admin/audit"
        params={tableParams}
        filters={[
          {
            param: "action",
            options: distinct.map((d) => ({
              value: d.action,
              label: actionLabel(d.action),
            })),
          },
        ]}
        total={total}
        page={lq.page}
        pageSize={lq.pageSize}
        emptyLabel={t("empty")}
      >
        {enriched.map((l) => (
          <tr
            key={l.id}
            className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02]"
          >
            <td className="px-5 py-3 text-[hsl(var(--foreground))]">
              {l.actorName}
            </td>
            <td className="px-5 py-3">
              <span
                className="text-sm text-[hsl(var(--foreground))]"
                title={l.action}
              >
                {l.actionLabel}
              </span>
            </td>
            <td className="max-w-[260px] truncate px-5 py-3 text-sm text-[hsl(var(--muted-foreground))]">
              {l.targetLabel}
            </td>
            <td className="max-w-[260px] truncate px-5 py-3 font-mono text-xs text-[hsl(var(--muted-foreground))]">
              {l.meta ? JSON.stringify(l.meta) : "—"}
            </td>
            <td className="px-5 py-3 text-right text-xs text-[hsl(var(--muted-foreground))]">
              {l.createdAt.toLocaleString()}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

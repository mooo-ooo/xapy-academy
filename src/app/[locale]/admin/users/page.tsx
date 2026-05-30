import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  DataTable,
  type Column,
  type FilterDef,
} from "@/components/admin/data-table";
import { buildListQuery, type SearchParams } from "@/lib/admin/list-query";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ApproveUserButton } from "@/components/admin/approve-user-button";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLES = ["ADMIN", "CTV", "USER"] as const;

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.users" });

  const sp = await searchParams;
  const session = await auth();
  const currentUserId = session?.user?.id;
  const lq = buildListQuery(sp, {
    sortable: ["createdAt", "email"],
    defaultSort: "createdAt",
    pageSize: 20,
  });

  const roleFilter = typeof sp.role === "string" ? sp.role.toUpperCase() : "";
  const roleWhere = (ROLES as readonly string[]).includes(roleFilter)
    ? { role: roleFilter as (typeof ROLES)[number] }
    : {};
  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const statusWhere =
    statusFilter === "pending"
      ? { isActive: false }
      : statusFilter === "active"
        ? { isActive: true }
        : {};
  const qWhere = lq.q
    ? {
        OR: [
          { email: { contains: lq.q } },
          { name: { contains: lq.q } },
        ],
      }
    : {};
  const where = { ...roleWhere, ...statusWhere, ...qWhere };

  const [users, total, pendingTotal] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: lq.orderBy,
      skip: lq.skip,
      take: lq.take,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferredLang: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { isActive: false } }),
  ]);

  const columns: Column[] = [
    { key: "user", header: t("table.user") },
    { key: "role", header: t("table.role") },
    { key: "lang", header: t("table.lang") },
    { key: "status", header: t("table.status") },
    { key: "createdAt", header: t("table.created"), sortable: true },
    { key: "actions", header: t("table.actions"), align: "right" },
  ];

  const filters: FilterDef[] = [
    {
      param: "status",
      options: [
        { value: "pending", label: t("filter.pending") },
        { value: "active", label: t("filter.active") },
      ],
    },
    { param: "role", options: ROLES.map((r) => ({ value: r, label: r })) },
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
            {t("subtitle", { count: total })}
          </p>
          {pendingTotal > 0 && statusFilter !== "pending" && (
            <Link
              href={{ pathname: "/admin/users", query: { status: "pending" } }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/15"
            >
              {t("pendingBanner", { count: pendingTotal })}
            </Link>
          )}
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus size={14} /> {t("newUser")}
          </Link>
        </Button>
      </header>

      <DataTable
        columns={columns}
        basePath="/admin/users"
        params={tableParams}
        filters={filters}
        total={total}
        page={lq.page}
        pageSize={lq.pageSize}
        emptyLabel={t("empty")}
      >
        {users.map((u) => (
          <tr
            key={u.id}
            className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02]"
          >
            <td className="px-5 py-4">
              <div className="font-medium text-[hsl(var(--foreground))]">
                {u.name ?? u.email}
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                {u.email}
              </div>
            </td>
            <td className="px-5 py-4">
              <Badge
                tone={
                  u.role === "ADMIN" ? "admin" : u.role === "CTV" ? "ctv" : "user"
                }
              >
                {u.role}
              </Badge>
            </td>
            <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
              {u.preferredLang.toUpperCase()}
            </td>
            <td className="px-5 py-4">
              {u.isActive ? (
                <Badge tone="user">{t("status.active")}</Badge>
              ) : (
                <Badge tone="archived">{t("status.inactive")}</Badge>
              )}
            </td>
            <td className="px-5 py-4 text-xs text-[hsl(var(--muted-foreground))]">
              {u.createdAt.toLocaleDateString()}
            </td>
            <td className="px-5 py-4 text-right">
              <div className="inline-flex items-center justify-end gap-1">
                {!u.isActive && u.id !== currentUserId && (
                  <ApproveUserButton userId={u.id} />
                )}
                <ImpersonateButton
                  userId={u.id}
                  userLabel={u.name ?? u.email}
                  disabled={!u.isActive || u.id === currentUserId}
                />
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/users/${u.id}`}>{t("manage")}</Link>
                </Button>
                <DeleteUserButton
                  userId={u.id}
                  userLabel={u.name ?? u.email}
                  disabled={u.id === currentUserId || u.role === "ADMIN"}
                />
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import {
  FileText,
  Folder,
  Languages,
  UserCheck,
  Users as UsersIcon,
} from "lucide-react";
import { enrichAuditEntries } from "@/lib/data/audit-format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tActions] = await Promise.all([
    getTranslations({ locale, namespace: "admin.dashboard" }),
    getTranslations({ locale, namespace: "admin.audit.actions" }),
  ]);
  const session = (await auth())!;
  const isAdmin = session.user.role === "ADMIN";

  const [
    userCount,
    moduleCount,
    articleCount,
    draftCount,
    pendingCount,
    pendingApprovalCount,
  ] = await Promise.all([
    isAdmin ? prisma.user.count() : Promise.resolve(0),
    isAdmin ? prisma.module.count() : Promise.resolve(0),
    isAdmin
      ? prisma.article.count()
      : prisma.articleTranslation.count({
          where: { translatorId: session.user.id },
        }),
    isAdmin
      ? prisma.article.count({ where: { status: "DRAFT" } })
      : Promise.resolve(0),
    prisma.articleTranslation.count({
      where: {
        translatorId: session.user.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    }),
    isAdmin
      ? prisma.user.count({ where: { isActive: false } })
      : Promise.resolve(0),
  ]);

  const recentAudit = isAdmin
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];
  const actionLabel = (a: string) => {
    try {
      return (tActions as unknown as (k: string) => string)(a);
    } catch {
      return a;
    }
  };
  const enrichedRecent =
    recentAudit.length > 0
      ? await enrichAuditEntries(recentAudit, actionLabel)
      : [];

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          {t("welcome")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          {session.user.name || session.user.email}{" "}
          <Badge tone={session.user.role === "ADMIN" ? "admin" : "ctv"}>
            {session.user.role}
          </Badge>
        </h1>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isAdmin && (
          <StatCard
            icon={<UsersIcon size={16} />}
            label={t("stats.users")}
            value={userCount}
            href="/admin/users"
          />
        )}
        {isAdmin && (
          <StatCard
            icon={<Folder size={16} />}
            label={t("stats.modules")}
            value={moduleCount}
            href="/admin/modules"
          />
        )}
        <StatCard
          icon={<FileText size={16} />}
          label={isAdmin ? t("stats.articles") : t("stats.translations")}
          value={articleCount}
          href={isAdmin ? "/admin/articles" : "/admin/translations"}
        />
        {isAdmin && (
          <StatCard
            icon={<FileText size={16} />}
            label={t("stats.drafts")}
            value={draftCount}
            href="/admin/articles?status=DRAFT"
          />
        )}
        {isAdmin && pendingApprovalCount > 0 && (
          <StatCard
            icon={<UserCheck size={16} />}
            label={t("stats.pendingApprovals")}
            value={pendingApprovalCount}
            href="/admin/users?status=pending"
            highlight
          />
        )}
        {!isAdmin && (
          <StatCard
            icon={<Languages size={16} />}
            label={t("stats.pendingTranslations")}
            value={pendingCount}
            href="/admin/translations"
          />
        )}
      </section>

      {isAdmin && enrichedRecent.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
                {t("recentActivity")}
              </h2>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {t("recentActivityHint")}
              </p>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              {t("viewAllAudit")}
            </Link>
          </div>
          <ul className="space-y-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
            {enrichedRecent.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {entry.actorName}
                  </span>
                  <span
                    className="text-[hsl(var(--muted-foreground))]"
                    title={entry.action}
                  >
                    {entry.actionLabel}
                  </span>
                  <span className="truncate text-[hsl(var(--foreground))]/80">
                    {entry.targetLabel}
                  </span>
                </div>
                <time className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                  {entry.createdAt.toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlight
          ? "rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 transition-colors hover:border-amber-400/60 hover:bg-amber-500/15"
          : "rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--card-hover))]"
      }
    >
      <div
        className={
          highlight
            ? "flex items-center gap-2 text-xs font-medium uppercase tracking-[0.6px] text-amber-200"
            : "flex items-center gap-2 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]"
        }
      >
        {icon} {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
        {value}
      </div>
    </Link>
  );
}

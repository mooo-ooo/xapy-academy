"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth";

type NavKey =
  | "dashboard"
  | "content"
  | "users"
  | "settings"
  | "audit";

const GROUPS: Array<{
  href: string;
  key: NavKey;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: AppRole[];
  /** Path prefixes (locale-stripped) that mark this group active. */
  match: string[];
}> = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MODERATOR", "CTV"], match: [] },
  {
    href: "/admin/articles",
    key: "content",
    icon: FileText,
    roles: ["ADMIN", "MODERATOR", "CTV"],
    match: ["/admin/articles", "/admin/translations", "/admin/modules", "/admin/tags"],
  },
  { href: "/admin/users", key: "users", icon: Users, roles: ["ADMIN", "MODERATOR"], match: ["/admin/users"] },
  { href: "/admin/settings", key: "settings", icon: Settings, roles: ["ADMIN", "MODERATOR"], match: ["/admin/settings"] },
  { href: "/admin/audit", key: "audit", icon: ScrollText, roles: ["ADMIN", "MODERATOR"], match: ["/admin/audit"] },
];

export function AdminSidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--inset))] py-6 lg:block">
      <Link
        href="/academy"
        className="mx-4 mb-8 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
      >
        <BookOpen size={14} /> {t("backToAcademy")}
      </Link>
      <nav className="flex flex-col gap-1 px-3">
        {GROUPS.filter((i) => i.roles.includes(role)).map((item) => {
          const isActive =
            item.match.length === 0
              ? pathname === "/admin"
              : item.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[hsl(var(--hover))] text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]",
              )}
            >
              <item.icon size={16} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

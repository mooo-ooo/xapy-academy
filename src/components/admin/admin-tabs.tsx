"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth";

type Tab = {
  key: "articles" | "translations" | "modules" | "tags";
  href: string;
  roles: AppRole[];
};

const GROUPS: Record<string, Tab[]> = {
  content: [
    { key: "articles", href: "/admin/articles", roles: ["ADMIN", "CTV"] },
    { key: "translations", href: "/admin/translations", roles: ["ADMIN", "CTV"] },
    { key: "modules", href: "/admin/modules", roles: ["ADMIN"] },
    { key: "tags", href: "/admin/tags", roles: ["ADMIN"] },
  ],
};

export function AdminTabs({
  group,
  role,
}: {
  group: "content";
  role: AppRole;
}) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav.tabs");
  const tabs = (GROUPS[group] ?? []).filter((tab) => tab.roles.includes(role));
  if (tabs.length <= 1) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-[hsl(var(--border))]">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[hsl(var(--foreground))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </div>
  );
}

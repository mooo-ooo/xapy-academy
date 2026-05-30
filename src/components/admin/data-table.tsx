"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Column = {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right";
  className?: string;
};

export type FilterDef = {
  param: string;
  options: { value: string; label: string }[];
};

type Params = Record<string, string>;

export function DataTable({
  columns,
  basePath,
  params,
  filters,
  total,
  page,
  pageSize,
  searchPlaceholder,
  emptyLabel,
  children,
}: {
  columns: Column[];
  basePath: string;
  params: Params;
  filters?: FilterDef[];
  total: number;
  page: number;
  pageSize: number;
  searchPlaceholder?: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.table");
  const router = useRouter();
  const [q, setQ] = useState(params.q ?? "");

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next: Record<string, string | undefined> = { ...params, ...overrides };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v !== undefined && v !== "") usp.set(k, v);
    }
    const qs = usp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }
  function push(overrides: Record<string, string | undefined>) {
    router.push(buildUrl(overrides));
  }

  // Debounced search → URL (resets to page 1).
  useEffect(() => {
    const current = params.q ?? "";
    if (q === current) return;
    const id = setTimeout(() => push({ q: q || undefined, page: undefined }), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function toggleSort(key: string) {
    const dir = params.sort === key && params.dir === "asc" ? "desc" : "asc";
    push({ sort: key, dir, page: undefined });
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder ?? t("search")}
            className="pl-9"
          />
        </div>
        {filters?.map((f, idx) => (
          <div
            key={f.param}
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              idx > 0 &&
                "border-l border-[hsl(var(--border))] pl-3 ml-1",
            )}
          >
            <Pill active={!params[f.param]} onClick={() => push({ [f.param]: undefined, page: undefined })}>
              {t("all")}
            </Pill>
            {f.options.map((o) => (
              <Pill
                key={o.value}
                active={params[f.param] === o.value}
                onClick={() => push({ [f.param]: o.value, page: undefined })}
              >
                {o.label}
              </Pill>
            ))}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-5 py-3 font-medium",
                    c.align === "right" ? "text-right" : "text-left",
                    c.className,
                  )}
                >
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-[hsl(var(--foreground))]"
                    >
                      {c.header}
                      {params.sort === c.key ? (
                        params.dir === "asc" ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )
                      ) : (
                        <ChevronsUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {total === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {t("totalCount", { count: total })}
            {pageCount > 1 &&
              ` · ${t("pageOf", { page, total: pageCount })}`}
          </span>
          <div className="flex gap-2">
            <NavBtn
              disabled={page <= 1}
              onClick={() => push({ page: String(page - 1) })}
            >
              {t("prev")}
            </NavBtn>
            <NavBtn
              disabled={page >= pageCount}
              onClick={() => push({ page: String(page + 1) })}
            >
              {t("next")}
            </NavBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium uppercase tracking-[0.6px] transition-colors",
        active
          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
          : "border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]",
      )}
    >
      {children}
    </button>
  );
}

function NavBtn({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

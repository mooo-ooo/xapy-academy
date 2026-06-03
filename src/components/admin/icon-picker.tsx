"use client";

import { useMemo, useState } from "react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { Search, X } from "lucide-react";
import { normalizeIconName } from "@/lib/module-icons";
import { cn } from "@/lib/utils";

const LIMIT = 120;

export function IconPicker({
  name,
  initial = "",
}: {
  name: string;
  initial?: string;
}) {
  const [value, setValue] = useState(() =>
    initial ? normalizeIconName(initial) : "",
  );
  const [query, setQuery] = useState("");

  const { results, total } = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "-");
    const all = q ? iconNames.filter((n) => n.includes(q)) : iconNames;
    return { results: all.slice(0, LIMIT), total: all.length };
  }, [query]);

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <input type="hidden" name={name} value={value} />

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons… (chart, book, brain, rocket, code…)"
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] pl-9 pr-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent-emerald))]"
          />
        </div>
        {value ? (
          <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2">
            <DynamicIcon
              name={value as IconName}
              size={18}
              className="text-emerald-200"
            />
            <span className="font-mono text-xs text-emerald-100">{value}</span>
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="Clear icon"
              className="text-emerald-200/70 transition-colors hover:text-emerald-100"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="shrink-0 px-1 text-xs text-[hsl(var(--muted-foreground))]">
            No icon selected
          </span>
        )}
      </div>

      <div
        className="grid max-h-[360px] gap-2 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--inset))] p-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))" }}
      >
        {results.map((iconName) => {
          const active = value === iconName;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => setValue(iconName)}
              title={iconName}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]",
              )}
            >
              <DynamicIcon name={iconName} size={20} />
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No icons match “{query}”.
          </p>
        )}
      </div>

      <p className="mt-2.5 text-xs text-[hsl(var(--muted-foreground))]">
        {query
          ? `${total} match${total === 1 ? "" : "es"}${total > LIMIT ? ` — showing first ${LIMIT}` : ""}`
          : `${iconNames.length.toLocaleString()} icons — type to search`}
        . Browse names at lucide.dev/icons.
      </p>
    </div>
  );
}

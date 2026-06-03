"use client";

import { useMemo, useState } from "react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { X } from "lucide-react";
import { normalizeIconName } from "@/lib/module-icons";
import { cn } from "@/lib/utils";

const LIMIT = 72;

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "-");
    const list = q ? iconNames.filter((n) => n.includes(q)) : iconNames;
    return list.slice(0, LIMIT);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons… (chart, book, brain, code…)"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent-emerald))]"
        />
        {value && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200">
            <DynamicIcon name={value as IconName} size={14} />
            <span className="font-mono">{value}</span>
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="Clear icon"
              className="ml-0.5 text-emerald-200/70 hover:text-emerald-100"
            >
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      <div className="grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 sm:grid-cols-10 md:grid-cols-12">
        {results.map((iconName) => {
          const active = value === iconName;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => setValue(iconName)}
              title={iconName}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]",
              )}
            >
              <DynamicIcon name={iconName} size={16} />
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="col-span-full p-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
            No icons match “{query}”.
          </p>
        )}
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {query
          ? `Showing ${results.length}${iconNames.filter((n) => n.includes(query.trim().toLowerCase().replace(/\s+/g, "-"))).length > LIMIT ? "+" : ""} matches`
          : `${iconNames.length} icons — type to search`}
        . Browse names at lucide.dev/icons.
      </p>
    </div>
  );
}

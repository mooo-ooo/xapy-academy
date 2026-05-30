"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MODULE_ICONS, MODULE_ICON_NAMES } from "@/lib/module-icons";
import { cn } from "@/lib/utils";

/**
 * Picks a Lucide icon NAME for a module (the public site renders the icon
 * by mapping this name through MODULE_ICONS). Writes the name into a hidden
 * input so the parent FormData submit is unchanged.
 */
export function IconPicker({
  name,
  initial = "",
}: {
  name: string;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name={name} value={value} />
      {MODULE_ICON_NAMES.map((iconName) => {
        const Icon = MODULE_ICONS[iconName];
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
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <Icon size={16} />
          </button>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear icon"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

"use client";

import { Label } from "@/components/ui/label";

const PRESETS: { name: string; value: string }[] = [
  { name: "Emerald", value: "#10b981" },
  { name: "Sky", value: "#38bdf8" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Slate", value: "#94a3b8" },
];

export function AccentColorField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            onClick={() => onChange(c.value)}
            className={`h-7 w-7 rounded-md border transition-transform hover:scale-110 ${
              value.toLowerCase() === c.value.toLowerCase()
                ? "border-white"
                : "border-white/20"
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
        <label className="ml-1 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-white/20 px-2 text-xs text-[hsl(var(--muted-foreground))]">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#10b981"}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          Custom
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-7 rounded-md px-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-white"
          >
            Reset
          </button>
        )}
        {value && (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {value}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
      )}
    </div>
  );
}

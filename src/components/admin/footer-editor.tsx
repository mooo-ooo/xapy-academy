"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type {
  FooterColumn,
  FooterConfig,
  FooterLocaleContent,
} from "@/lib/data/site";

export const SOCIAL_PLATFORMS = [
  "twitter",
  "telegram",
  "youtube",
  "github",
  "linkedin",
  "facebook",
  "instagram",
  "discord",
  "tiktok",
  "mail",
  "website",
] as const;

function localeLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function FooterEditor({
  value,
  onChange,
  locale,
  onLocaleChange,
  locales,
  labels,
}: {
  value: FooterConfig;
  onChange: (next: FooterConfig) => void;
  locale: string;
  onLocaleChange: (next: string) => void;
  locales: string[];
  labels: {
    enabled: string;
    enabledHint: string;
    social: string;
    socialHint: string;
    addSocial: string;
    urlPlaceholder: string;
    localeLabel: string;
    intro: string;
    introPlaceholder: string;
    copyright: string;
    copyrightHint: string;
    columns: string;
    addColumn: string;
    columnTitle: string;
    addLink: string;
    linkLabel: string;
    linkUrl: string;
  };
}) {
  const entry: FooterLocaleContent = value.translations[locale] ?? {};
  const columns: FooterColumn[] = entry.columns ?? [];

  function patchEntry(patch: Partial<FooterLocaleContent>) {
    onChange({
      ...value,
      translations: {
        ...value.translations,
        [locale]: { ...entry, ...patch },
      },
    });
  }

  function setColumns(next: FooterColumn[]) {
    patchEntry({ columns: next });
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-4">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent-emerald))]"
        />
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
            {labels.enabled}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {labels.enabledHint}
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>{labels.social}</Label>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {labels.socialHint}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {value.social.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={s.platform}
                onChange={(e) => {
                  const next = [...value.social];
                  next[i] = { ...next[i], platform: e.target.value };
                  onChange({ ...value, social: next });
                }}
                className="h-10 w-36 shrink-0 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent-emerald))]"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Input
                value={s.url}
                onChange={(e) => {
                  const next = [...value.social];
                  next[i] = { ...next[i], url: e.target.value };
                  onChange({ ...value, social: next });
                }}
                placeholder={labels.urlPlaceholder}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 p-0 text-[hsl(var(--muted-foreground))]"
                onClick={() =>
                  onChange({
                    ...value,
                    social: value.social.filter((_, j) => j !== i),
                  })
                }
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onChange({
                  ...value,
                  social: [
                    ...value.social,
                    { platform: SOCIAL_PLATFORMS[0], url: "" },
                  ],
                })
              }
            >
              <Plus size={14} /> {labels.addSocial}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 md:max-w-xs">
        <Label htmlFor="footerLocale">{labels.localeLabel}</Label>
        <select
          id="footerLocale"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
          className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent-emerald))]"
        >
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()} — {localeLabel(l)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="footerIntro">{labels.intro}</Label>
        <Textarea
          id="footerIntro"
          rows={2}
          value={entry.intro ?? ""}
          onChange={(e) => patchEntry({ intro: e.target.value })}
          maxLength={800}
          placeholder={labels.introPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="footerCopyright">{labels.copyright}</Label>
        <Input
          id="footerCopyright"
          value={entry.copyright ?? ""}
          onChange={(e) => patchEntry({ copyright: e.target.value })}
          maxLength={200}
          placeholder="© {year} {siteName}"
        />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {labels.copyrightHint}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Label>{labels.columns}</Label>
        {columns.map((col, ci) => (
          <div
            key={ci}
            className="flex flex-col gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-4"
          >
            <div className="flex items-center gap-2">
              <Input
                value={col.title}
                onChange={(e) => {
                  const next = [...columns];
                  next[ci] = { ...col, title: e.target.value };
                  setColumns(next);
                }}
                placeholder={labels.columnTitle}
                className="flex-1 font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 p-0 text-[hsl(var(--muted-foreground))]"
                onClick={() => setColumns(columns.filter((_, j) => j !== ci))}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="flex flex-col gap-2 pl-1">
              {col.links.map((link, li) => (
                <div key={li} className="flex items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => {
                      const next = [...columns];
                      const links = [...col.links];
                      links[li] = { ...link, label: e.target.value };
                      next[ci] = { ...col, links };
                      setColumns(next);
                    }}
                    placeholder={labels.linkLabel}
                    className="w-40 shrink-0"
                  />
                  <Input
                    value={link.href}
                    onChange={(e) => {
                      const next = [...columns];
                      const links = [...col.links];
                      links[li] = { ...link, href: e.target.value };
                      next[ci] = { ...col, links };
                      setColumns(next);
                    }}
                    placeholder={labels.linkUrl}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0 text-[hsl(var(--muted-foreground))]"
                    onClick={() => {
                      const next = [...columns];
                      next[ci] = {
                        ...col,
                        links: col.links.filter((_, j) => j !== li),
                      };
                      setColumns(next);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = [...columns];
                    next[ci] = {
                      ...col,
                      links: [...col.links, { label: "", href: "" }],
                    };
                    setColumns(next);
                  }}
                >
                  <Plus size={14} /> {labels.addLink}
                </Button>
              </div>
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setColumns([...columns, { title: "", links: [] }])}
          >
            <Plus size={14} /> {labels.addColumn}
          </Button>
        </div>
      </div>
    </div>
  );
}

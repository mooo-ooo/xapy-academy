"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Human-readable label for a locale code, localised into the current UI
 * locale via `Intl.DisplayNames`. Works for any DB-added locale without a
 * hardcoded map; falls back to the upper-cased code.
 */
function localeLabel(code: string, displayLocale: string): string {
  try {
    return (
      new Intl.DisplayNames([displayLocale], { type: "language" }).of(code) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

export function LanguageSwitcher({
  isAuthenticated,
  locales,
}: {
  isAuthenticated: boolean;
  locales: string[];
}) {
  const t = useTranslations("header.languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  async function onSelect(next: string) {
    if (next === locale) return;
    if (!isAuthenticated) return;

    startTransition(async () => {
      try {
        await fetch("/api/me/preferred-lang", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });
      } catch {
        // Non-fatal: navigation still proceeds, server syncs on next refresh.
      }
      router.replace(pathname, { locale: next });
    });
  }

  const trigger = (
    <button
      type="button"
      aria-label={t("label")}
      disabled={!isAuthenticated || pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-[hsl(var(--muted-foreground))]"
    >
      <Globe size={18} strokeWidth={2} />
      <span className="text-xs uppercase tracking-[0.6px]">{locale}</span>
    </button>
  );

  if (!isAuthenticated) {
    return (
      <Tooltip.Provider delayDuration={150}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            {/* span wrapper so disabled button still triggers tooltip */}
            <span className="inline-flex">{trigger}</span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              sideOffset={8}
              className="z-50 max-w-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] px-3 py-2 text-xs text-[hsl(var(--foreground))] shadow-xl backdrop-blur-2xl"
            >
              {t("guestTooltip")}
              <Tooltip.Arrow className="fill-white/10" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-36 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-1 text-sm text-[hsl(var(--foreground))] shadow-xl backdrop-blur-2xl"
        >
          {locales.map((l) => (
            <DropdownMenu.Item
              key={l}
              onSelect={() => onSelect(l)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-[hsl(var(--hover))]"
            >
              <span>{localeLabel(l, locale)}</span>
              {locale === l && (
                <Check size={14} className="text-[hsl(var(--accent-emerald))]" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

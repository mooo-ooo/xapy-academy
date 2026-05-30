"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Filter, Globe, X, type LucideIcon } from "lucide-react";
import { moduleIcon } from "@/lib/module-icons";
import type { ModuleCard } from "@/lib/data/modules";

/**
 * Chip nav mirroring kiyotaka.ai/academy:
 *   - Left: "All Modules" (white pill when active) + the first few module
 *     chips, each prefixed with a Lucide icon mapped from `module.icon`
 *   - Right: filter icon + "View All Topics" — opens the "Explore Topics"
 *     modal (pixel-matched to kiyotaka) listing every module as a card.
 *
 * Module → icon mapping is keyed by the seed `icon` string. Unknown
 * names fall back to a generic globe.
 */

/** How many module chips to show inline before the rest move into the
 *  "Explore Topics" modal. */
const INLINE_COUNT = 4;

export function ModuleNav({
  modules,
  activeSlug,
  labels,
}: {
  modules: ModuleCard[];
  activeSlug?: string;
  labels: { all: string; viewAll: string };
}) {
  const t = useTranslations("academy.topics");
  const [open, setOpen] = useState(false);

  // Always keep the active module visible inline, even if it sits past
  // the inline cutoff.
  const base = modules.slice(0, INLINE_COUNT);
  const activeMod = activeSlug
    ? modules.find((m) => m.slug === activeSlug)
    : undefined;
  const inline =
    activeMod && !base.some((m) => m.slug === activeSlug)
      ? [activeMod, ...base.slice(0, INLINE_COUNT - 1)]
      : base;

  const hasMore = modules.length > inline.length;

  return (
    <nav
      className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6 whitespace-nowrap border-b border-[hsl(var(--border))] px-6 py-4"
      style={{
        fontFamily: "var(--font-system)",
        fontSize: 14,
        letterSpacing: "0.6px",
      }}
    >
      <ul className="flex items-center gap-2 overflow-x-auto">
        <li>
          <Chip href="/academy" active={!activeSlug} Icon={Globe}>
            {labels.all}
          </Chip>
        </li>
        {inline.map((m) => (
          <li key={m.id}>
            <Chip
              href={`/academy/${m.slug}`}
              active={activeSlug === m.slug}
              Icon={moduleIcon(m.icon)}
            >
              {m.name}
            </Chip>
          </li>
        ))}
      </ul>

      {hasMore && (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="hidden shrink-0 items-center gap-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] md:inline-flex"
            >
              <Filter size={14} strokeWidth={2} />
              {labels.viewAll}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content
              className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(1294px,calc(100vw-32px))] max-h-[calc(100vh-64px)] overflow-y-auto rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-2xl backdrop-blur-2xl sm:p-10"
              style={{
                fontFamily: "var(--font-system)",
                // Center via transform (NOT Tailwind's translate utility —
                // Tailwind v4 uses the `translate` CSS property, which would
                // stack with the transform in the keyframes and double the
                // offset, flashing the modal to the top-left before settling).
                transform: "translate(-50%, -50%)",
              }}
            >
              <Dialog.Close
                className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]"
                aria-label={t("close")}
              >
                <X size={20} strokeWidth={2} />
              </Dialog.Close>

              <Dialog.Title
                className="font-bold text-[hsl(var(--foreground))]"
                style={{ fontSize: 30, fontWeight: 700, letterSpacing: "1.12px" }}
              >
                {t("title")}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                {t("subtitle")}
              </Dialog.Description>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TopicCard
                  href="/academy"
                  active={!activeSlug}
                  Icon={Globe}
                  title={labels.all}
                  subtitle={t("guideCount", {
                    count: modules.reduce((n, m) => n + m.articleCount, 0),
                  })}
                  onNavigate={() => setOpen(false)}
                />
                {modules.map((m) => (
                  <TopicCard
                    key={m.id}
                    href={`/academy/${m.slug}`}
                    active={activeSlug === m.slug}
                    Icon={moduleIcon(m.icon)}
                    title={m.name}
                    subtitle={
                      m.description ?? t("guideCount", { count: m.articleCount })
                    }
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </nav>
  );
}

function Chip({
  href,
  active,
  Icon,
  children,
}: {
  href: string;
  active: boolean;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex h-9 items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-4 font-medium text-[hsl(var(--background))]"
          : "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))]"
      }
    >
      <Icon size={14} strokeWidth={2} />
      {children}
    </Link>
  );
}

/**
 * Topic card in the Explore Topics modal — kiyotaka tokens:
 *   card: bg rgba(24,24,27,0.5), radius 12px, padding 24px
 *   icon box: 50×50, radius 8px, black bg
 *   active: emerald border + emerald icon tint + emerald title
 */
function TopicCard({
  href,
  active,
  Icon,
  title,
  subtitle,
  onNavigate,
}: {
  href: string;
  active: boolean;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group flex items-start gap-4 rounded-xl border p-6 transition-colors ${
        active
          ? "border-emerald-400/40 bg-emerald-500/[0.07]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--card-hover))]"
      }`}
    >
      <span
        className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-emerald-500/15 text-[hsl(var(--accent-emerald))]"
            : "bg-[hsl(var(--inset))] text-[hsl(var(--foreground))]"
        }`}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h3
          className={`text-base font-bold ${
            active ? "text-[hsl(var(--accent-emerald))]" : "text-[hsl(var(--foreground))]"
          }`}
        >
          {title}
        </h3>
        <p className="mt-1.5 truncate text-sm text-[hsl(var(--muted-foreground))]">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

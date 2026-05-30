"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/mdx";

/**
 * Right-side article TOC — mirrors kiyotaka.ai:
 *   ON THIS PAGE                      (small uppercase label)
 *   | 1.0 Introduction               (active = emerald left bar)
 *     1.1 Sub-heading
 *   2.0 Liquidations
 *     2.1 Liquidation Clusters
 *
 * Behavior
 *   - Scroll-spy via rAF-throttled scroll listener: the active entry
 *     is the last heading whose top has scrolled past the fixed header
 *     offset. Cheaper and more deterministic than IntersectionObserver
 *     for this "topmost above fold" pattern.
 *   - Clicking an entry smooth-scrolls to the heading and updates the
 *     URL hash without the default instant jump.
 *
 * `scroll-margin-top: 100px` on .prose-academy h2/h3 (globals.css)
 * keeps the heading clear of the fixed top header.
 */
export function TocSidebar({
  entries,
  label,
  className = "",
}: {
  entries: TocEntry[];
  label: string;
  /** Extra classes (e.g. grid placement) merged onto the outer <aside>. */
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(
    entries[0]?.slug ?? null,
  );

  useEffect(() => {
    if (entries.length === 0) return;

    // 120px ≈ sticky header (72px) + breathing room. Headings with
    // a top <= this are considered "above or at" the active line.
    const OFFSET = 120;
    let rafId = 0;

    const compute = () => {
      rafId = 0;
      let next = entries[0]?.slug ?? null;
      for (const e of entries) {
        const el = document.getElementById(e.slug);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= OFFSET) next = e.slug;
        else break; // entries are in document order — stop at first below
      }
      setActive((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [entries]);

  if (entries.length === 0) return null;

  const handleClick = (slug: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    const el = document.getElementById(slug);
    if (!el) return;
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#${slug}`);
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(slug);
  };

  return (
    <aside
      aria-label={label}
      className={`sticky top-24 hidden h-fit w-64 shrink-0 self-start lg:block ${className}`}
    >
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <ul className="space-y-2 text-sm">
        {entries.map((e) => {
          const isActive = active === e.slug;
          const indent = e.depth === 3 ? "pl-6" : "pl-3";
          return (
            <li key={e.slug} className="relative">
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-0.5 rounded bg-[hsl(var(--accent-emerald))]"
                />
              )}
              <a
                href={`#${e.slug}`}
                onClick={handleClick(e.slug)}
                aria-current={isActive ? "location" : undefined}
                className={`block ${indent} leading-snug transition-colors ${
                  isActive
                    ? "font-medium text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <span className="font-mono text-[10px] tracking-[0.5px] opacity-70">
                  {e.number}
                </span>{" "}
                {e.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

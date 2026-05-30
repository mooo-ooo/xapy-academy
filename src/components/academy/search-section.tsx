"use client";

import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * Search section — pixel values from tokens.json:
 *   wrapper: max-w 980, h 62, padding 6, radius 9999, bg rgba(24,24,27,.9),
 *            border 1px rgba(255,255,255,.1), backdrop-blur 40, shadow extracted
 *   input: 16px / 300 / lh 24 / tracking 0.4, h 48, color white
 *   trending label: mono 12px / 500 / lh 18 / tracking 0.6
 */
export function SearchSection({
  trending,
  initialQuery = "",
}: {
  trending: Array<{ slug: string; name: string }>;
  initialQuery?: string;
}) {
  const t = useTranslations("academy.search");
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  function go(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(value);
  }

  return (
    <div
      className="relative z-20 mx-auto flex w-full flex-col items-center px-6"
      style={{
        maxWidth: 980,
        fontFamily: "var(--font-system)",
        animation: "var(--animate-fade-in-up)",
        animationDelay: "0.2s",
        opacity: 0,
      }}
    >
      <form onSubmit={onSubmit} className="relative w-full">
        <div
          className="relative flex items-center"
          style={{
            backgroundColor: "hsl(var(--card-hover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 9999,
            padding: 6,
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow:
              "rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.04) 0px 10px 10px -5px",
          }}
        >
          <div
            className="flex shrink-0 items-center justify-center pl-4 pr-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <Search size={24} strokeWidth={2} />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("placeholder")}
            disabled={pending}
            className="flex-1 border-0 bg-transparent outline-none placeholder:text-[hsl(var(--muted-foreground))] disabled:opacity-60"
            style={{
              color: "hsl(var(--foreground))",
              fontSize: 16,
              fontWeight: 300,
              lineHeight: "24px",
              letterSpacing: "0.4px",
              height: 48,
            }}
          />
          <button
            type="submit"
            disabled={pending || !value.trim()}
            className="flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60"
            style={{
              backgroundColor: "hsl(var(--inset))",
              color: "hsl(var(--muted-foreground))",
              padding: 14,
              boxShadow: "rgba(0,0,0,0.05) 0px 1px 2px 0px",
            }}
            aria-label="Search"
          >
            <ArrowRight size={20} strokeWidth={2} />
          </button>
        </div>
      </form>

      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: "18px",
          letterSpacing: "0.6px",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles
            size={14}
            strokeWidth={2}
            style={{ color: "rgb(16,185,129)" }}
          />
          {t("trending")}:
        </span>
        {trending.map((topic) => (
          <button
            key={topic.slug}
            type="button"
            onClick={() => {
              setValue(topic.name);
              go(topic.name);
            }}
            className="font-medium underline decoration-[rgb(63,63,70)] decoration-1 underline-offset-4 transition-colors hover:text-[hsl(var(--foreground))] hover:decoration-[rgb(161,161,170)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {topic.name}
          </button>
        ))}
      </div>
    </div>
  );
}

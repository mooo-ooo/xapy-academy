"use client";

import { Share2, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

/**
 * Share button (rail variant) — uses the Web Share API on capable
 * browsers and falls back to copying the URL to clipboard with a
 * toast confirmation.
 */
export function ShareButton({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const nav = typeof navigator !== "undefined" ? navigator : null;
      if (!nav) return;
      try {
        if (typeof nav.share === "function") {
          await nav.share({ title, url });
          return;
        }
        await nav.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // User dismissed share sheet — silent.
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share this article"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--foreground))]"
    >
      {copied ? (
        <Check size={16} strokeWidth={2} className="text-[hsl(var(--accent-emerald))]" />
      ) : (
        <Share2 size={16} strokeWidth={2} />
      )}
    </button>
  );
}

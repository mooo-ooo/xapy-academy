"use client";

import { Heart, Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toast } from "@/components/ui/toast";

/**
 * Real like button — backed by `ArticleLike(userId, articleId)` rows.
 *
 * Behavior:
 *   - Guest: clicking opens the login page with `?next=` set so they
 *     come back to this article. We do NOT pretend to track anonymous
 *     likes anymore.
 *   - Authenticated: optimistic toggle, then POST/DELETE
 *     /api/likes/:id. If the server contradicts (race, stale tab) we
 *     revert and surface a toast.
 *
 * Initial state comes from the server (`initiallyLiked`) — no
 * localStorage, no first-render flicker.
 */
export function LikeButton({
  articleId,
  initialCount,
  initiallyLiked,
  isAuthenticated,
  locale,
  variant = "chip",
}: {
  articleId: string;
  initialCount: number;
  initiallyLiked: boolean;
  isAuthenticated: boolean;
  /** Used to build the post-login redirect target. */
  locale: string;
  /**
   * `chip` — horizontal pill with icon + count side-by-side. Used in
   *   list contexts.
   * `rail` — vertical circle button with the count stacked below it.
   *   Used in the sticky left rail of the article-detail page.
   */
  variant?: "chip" | "rail";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initiallyLiked);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isAuthenticated) {
      const next = encodeURIComponent(`/${locale}${pathname}`);
      router.push(`/login?next=${next}`);
      return;
    }

    const wantLiked = !liked;
    // Optimistic UI
    setLiked(wantLiked);
    setCount((c) => Math.max(0, c + (wantLiked ? 1 : -1)));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/likes/${articleId}`, {
          method: wantLiked ? "POST" : "DELETE",
        });
        if (res.status === 401) {
          // Session expired between paint and click
          setLiked(!wantLiked);
          setCount((c) => Math.max(0, c - (wantLiked ? 1 : -1)));
          const next = encodeURIComponent(`/${locale}${pathname}`);
          router.push(`/login?next=${next}`);
          return;
        }
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = (await res.json()) as {
          liked: boolean;
          likeCount: number;
        };
        // Trust the server's truth
        setLiked(data.liked);
        setCount(data.likeCount);
      } catch {
        // Revert optimistic update
        setLiked(!wantLiked);
        setCount((c) => Math.max(0, c - (wantLiked ? 1 : -1)));
        toast.error("Couldn't save your like — try again");
      }
    });
  }

  const ariaLabel = !isAuthenticated
    ? "Log in to like"
    : liked
      ? "Unlike this article"
      : "Like this article";

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={ariaLabel}
        aria-pressed={liked}
        title={!isAuthenticated ? "Log in to like" : undefined}
        className="flex flex-col items-center gap-1 disabled:opacity-60"
      >
        <span
          className={
            liked
              ? "flex h-10 w-10 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20"
              : "flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--foreground))]"
          }
        >
          {!isAuthenticated ? (
            <Lock size={14} strokeWidth={2} />
          ) : (
            <Heart
              size={16}
              strokeWidth={2}
              className={liked ? "fill-red-400 text-red-400" : ""}
            />
          )}
        </span>
        <span className="text-xs tabular-nums text-[hsl(var(--muted-foreground))]">
          {count}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={ariaLabel}
      aria-pressed={liked}
      title={!isAuthenticated ? "Log in to like" : undefined}
      className={
        liked
          ? "inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-60"
          : "inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--foreground))] disabled:opacity-60"
      }
    >
      {!isAuthenticated ? (
        <Lock size={12} strokeWidth={2} />
      ) : (
        <Heart
          size={14}
          strokeWidth={2}
          className={liked ? "fill-red-400 text-red-400" : ""}
        />
      )}
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

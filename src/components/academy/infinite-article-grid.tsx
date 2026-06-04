"use client";

import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { ArticleCard } from "@/components/academy/article-card";
import { ArticleCardSkeleton } from "@/components/academy/article-card-skeleton";
import { useInfiniteFeed } from "@/hooks/use-infinite-feed";
import type { ArticleListItem } from "@/lib/data/articles";
import type { Locale } from "@/i18n/routing";

type WireItem = Omit<ArticleListItem, "publishedAt"> & {
  publishedAt: string | null;
};

function revive(items: WireItem[]): ArticleListItem[] {
  return items.map((i) => ({
    ...i,
    publishedAt: i.publishedAt ? new Date(i.publishedAt) : null,
  }));
}

export function InfiniteArticleGrid({
  initialItems,
  initialCursor,
  locale,
  type,
  moduleId,
  excludeId,
  gridClassName = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: {
  initialItems: ArticleListItem[];
  initialCursor: string | null;
  locale: Locale;
  type: "latest" | "module";
  /** Required when type === "module". */
  moduleId?: string;
  /** When type === "module": drop this article id (e.g. the one being read). */
  excludeId?: string;
  gridClassName?: string;
}) {
  const fetchNext = useCallback(
    async (cursor: string) => {
      const params = new URLSearchParams({
        type,
        locale,
        cursor,
        limit: "12",
      });
      if (type === "module" && moduleId) params.set("moduleId", moduleId);
      if (type === "module" && excludeId) params.set("exclude", excludeId);
      const res = await fetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Feed ${res.status}`);
      const json = (await res.json()) as {
        items: WireItem[];
        nextCursor: string | null;
      };
      return { items: revive(json.items), nextCursor: json.nextCursor };
    },
    [type, locale, moduleId, excludeId],
  );

  const { items, loading, done, sentinelRef, error } = useInfiniteFeed<
    ArticleListItem,
    string
  >({
    initialItems,
    initialCursor,
    fetchNext,
  });

  return (
    <>
      <div className={gridClassName}>
        {items.map((a) => (
          <ArticleCard key={a.id} moduleSlug={a.moduleSlug} article={a} />
        ))}
        {loading && (
          <>
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
          </>
        )}
      </div>
      {!done && (
        <div
          ref={sentinelRef}
          className="mt-8 flex h-12 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {error && <span className="text-red-300">{error}</span>}
        </div>
      )}
    </>
  );
}

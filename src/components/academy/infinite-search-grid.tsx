"use client";

import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { SearchResultCard } from "@/components/academy/search-result-card";
import { useInfiniteFeed } from "@/hooks/use-infinite-feed";
import type { SearchHit } from "@/lib/data/search";
import type { Locale } from "@/i18n/routing";

type WireHit = Omit<SearchHit, "publishedAt"> & { publishedAt: string | null };

function revive(hits: WireHit[]): SearchHit[] {
  return hits.map((h) => ({
    ...h,
    publishedAt: h.publishedAt ? new Date(h.publishedAt) : null,
  }));
}

export function InfiniteSearchGrid({
  initialHits,
  initialOffset,
  query,
  locale,
}: {
  initialHits: SearchHit[];
  /** null when there are no further pages. */
  initialOffset: number | null;
  query: string;
  locale: Locale;
}) {
  const fetchNext = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({
        type: "search",
        locale,
        q: query,
        offset: String(offset),
        limit: "12",
      });
      const res = await fetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Feed ${res.status}`);
      const json = (await res.json()) as {
        hits: WireHit[];
        nextOffset: number | null;
      };
      return { items: revive(json.hits), nextCursor: json.nextOffset };
    },
    [query, locale],
  );

  const { items, loading, done, sentinelRef, error } = useInfiniteFeed<
    SearchHit,
    number
  >({
    initialItems: initialHits,
    initialCursor: initialOffset,
    fetchNext,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((hit) => (
          <SearchResultCard key={hit.articleId} hit={hit} query={query} />
        ))}
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

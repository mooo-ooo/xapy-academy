"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Generic infinite-scroll hook. Owns the items list + cursor state,
 * watches a sentinel element via IntersectionObserver, and calls
 * `fetchNext(cursor)` to extend when the sentinel enters the viewport
 * (with 400px root margin so loading kicks off before the user hits
 * the bottom).
 *
 * Cursor type is left generic so callers can use opaque strings
 * (article keyset cursors) or numeric offsets (search) interchangeably.
 */
export function useInfiniteFeed<Item, Cursor>(opts: {
  initialItems: Item[];
  initialCursor: Cursor | null;
  fetchNext: (cursor: Cursor) => Promise<{
    items: Item[];
    nextCursor: Cursor | null;
  }>;
}) {
  const [items, setItems] = useState<Item[]>(opts.initialItems);
  const [cursor, setCursor] = useState<Cursor | null>(opts.initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchRef = useRef(opts.fetchNext);
  fetchRef.current = opts.fetchNext;
  const stateRef = useRef({ cursor, loading });
  stateRef.current = { cursor, loading };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const { cursor: c, loading: l } = stateRef.current;
        if (l || c === null || c === undefined) return;
        setLoading(true);
        setError(null);
        fetchRef
          .current(c)
          .then((page) => {
            setItems((prev) => [...prev, ...page.items]);
            setCursor(page.nextCursor);
          })
          .catch((e: unknown) => {
            setError(e instanceof Error ? e.message : "Failed to load");
          })
          .finally(() => setLoading(false));
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return {
    items,
    loading,
    error,
    done: cursor === null,
    sentinelRef,
  };
}

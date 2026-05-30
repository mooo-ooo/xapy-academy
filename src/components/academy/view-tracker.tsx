"use client";

import { useEffect } from "react";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_PREFIX = "kv-view:";

/**
 * Mounts once per article page render, POSTs to `/api/views/[id]` if
 * this browser hasn't already done so within the dedup window. The
 * server applies a bot-UA filter; this component handles per-visitor
 * spam (refreshes, back-button, dev StrictMode double-mount).
 *
 * No state, no UI — pure side-effect on hydration.
 */
export function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;

    try {
      const key = STORAGE_PREFIX + articleId;
      const lastRaw = window.localStorage.getItem(key);
      const last = lastRaw ? Number(lastRaw) : 0;
      if (Number.isFinite(last) && Date.now() - last < DEDUP_WINDOW_MS) {
        return;
      }
      // Stamp the timestamp BEFORE the fetch so StrictMode's double-effect
      // and quick double-mounts on nav both early-exit on the second pass.
      window.localStorage.setItem(key, String(Date.now()));
    } catch {
      // localStorage disabled / private mode — fall through and let
      // the server bot filter be the only line of defence.
    }

    fetch(`/api/views/${encodeURIComponent(articleId)}`, {
      method: "POST",
      keepalive: true,
      cache: "no-store",
    }).catch(() => {
      // Network blip — tracking is best-effort, do nothing.
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return null;
}

"use client";

import { useEffect } from "react";

/**
 * Web Vitals reporter, mounted in /[locale]/layout so the whole app is
 * instrumented.
 *
 *  - development: colored console line per metric.
 *  - production: beacons each metric to `/api/vitals`, tagged with the
 *    current path, so field CrUX-style data (CLS / INP / LCP / FCP / TTFB)
 *    can flow to a real RUM sink.
 *
 * `/api/vitals` is POST-only and robots-disallowed (it's under /api), so it
 * never affects crawling.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    let active = true;
    const isDev = process.env.NODE_ENV === "development";

    (async () => {
      const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import(
        "web-vitals"
      );
      if (!active) return;

      type AnyMetric = {
        name: string;
        value: number;
        rating: "good" | "needs-improvement" | "poor";
        id: string;
        navigationType?: string;
      };

      const report = (m: AnyMetric) => {
        if (isDev) {
          const color =
            m.rating === "good"
              ? "color:#10b981"
              : m.rating === "needs-improvement"
                ? "color:#f59e0b"
                : "color:#ef4444";
          // eslint-disable-next-line no-console
          console.log(
            `%c[web-vitals]%c ${m.name} = ${Math.round(m.value * 1000) / 1000}` +
              ` (%c${m.rating}%c)` +
              (m.navigationType ? ` nav=${m.navigationType}` : ""),
            "color:#a1a1aa;font-weight:600",
            "color:#fafafa",
            color,
            "color:#a1a1aa",
          );
          return;
        }

        const body = JSON.stringify({
          name: m.name,
          value: Math.round(m.value * 1000) / 1000,
          rating: m.rating,
          id: m.id,
          navigationType: m.navigationType ?? null,
          path: window.location.pathname,
        });
        // sendBeacon survives page unload (when INP/CLS finalize); fall back
        // to keepalive fetch where it's unavailable.
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon(
            "/api/vitals",
            new Blob([body], { type: "application/json" }),
          );
        } else {
          void fetch("/api/vitals", {
            method: "POST",
            body,
            keepalive: true,
            headers: { "content-type": "application/json" },
          });
        }
      };

      onCLS(report);
      onINP(report);
      onLCP(report);
      onFCP(report);
      onTTFB(report);
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}

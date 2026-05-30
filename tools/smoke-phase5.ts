/**
 * Phase 5 search smoke test.
 *
 * 1. /en/search?q=delta returns hits with the demo article (FULLTEXT).
 * 2. /en/search?q=footprint also returns hits (token deep in bodyMdx).
 * 3. /en/search?q=zzznoresult shows the empty-state copy.
 * 4. Submitting the search form on /en/academy navigates to /en/search?q=...
 * 5. Clicking a trending pill on landing navigates to /en/search?q=DELTA.
 * 6. /vi/search?q=delta works for authed VI user (after login).
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "tools", "output");
const ADMIN_PASSWORD = process.env.SMOKE_PASSWORD ?? "";
if (!ADMIN_PASSWORD) {
  console.error("Set SMOKE_PASSWORD.");
  process.exit(2);
}

let failed = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) failed++;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  // 1 — FULLTEXT hit
  await page.goto(`${BASE}/en/search?q=delta`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, "p5-1-search-delta.png"),
    fullPage: true,
  });
  check(
    "Search 'delta' shows article result",
    await page.locator("text=/Delta explained/i").first().isVisible(),
  );

  // 2 — FULLTEXT body token
  await page.goto(`${BASE}/en/search?q=footprint`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "p5-2-search-footprint.png"),
    fullPage: true,
  });
  check(
    "Search 'footprint' finds article via body content",
    await page.locator("text=/Delta explained/i").first().isVisible(),
  );

  // 3 — empty state (use truly opaque token; ngram parser would still
  // tokenize "zzznoresult" into ngrams like "no"/"or"/"ul" that appear in
  // the seed body — use a string of unmatchable characters instead)
  await page.goto(`${BASE}/en/search?q=qxqxqxqxqxqx`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "p5-3-search-empty.png"),
    fullPage: true,
  });
  check(
    "Empty state copy visible for nonsense query",
    await page.locator("text=/No articles match/i").first().isVisible(),
  );

  // 4 — submit search from landing
  await page.goto(`${BASE}/en/academy`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="Search"]', "delta");
  await Promise.all([
    page.waitForURL((u) => new URL(u).pathname.endsWith("/search"), {
      timeout: 10_000,
    }),
    page.locator('button[aria-label="Search"]').click(),
  ]);
  check(
    "Submit on landing navigates to /search?q=delta",
    new URL(page.url()).search.includes("q=delta"),
    page.url(),
  );

  // 5 — trending pill navigates
  await page.goto(`${BASE}/en/academy`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForURL((u) => new URL(u).pathname.endsWith("/search"), {
      timeout: 10_000,
    }),
    page.locator('button:has-text("DELTA")').first().click(),
  ]);
  check(
    "Trending DELTA pill navigates to /search?q=DELTA",
    new URL(page.url()).search.toLowerCase().includes("q=delta"),
    page.url(),
  );

  // 6 — authed VI search
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@academy.local");
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !new URL(u).pathname.endsWith("/login"), {
      timeout: 10_000,
    }),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(`${BASE}/vi/search?q=delta`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, "p5-6-search-vi.png"),
    fullPage: true,
  });
  check(
    "VI search finds 'Delta là gì'",
    await page.locator("text=/Delta là gì/i").first().isVisible(),
  );

  await browser.close();
  console.log(
    failed === 0 ? "\n[smoke] ALL PASS" : `\n[smoke] ${failed} FAILED`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

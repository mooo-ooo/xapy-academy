/**
 * Phase 3 smoke test:
 * 1. Guest /en/academy/order-flow-footprints/delta-explained renders MDX.
 * 2. Login as admin (preferredLang=vi). Visit /vi/academy/order-flow-footprints/delta-la-gi
 *    → renders VI content, no fallback banner.
 * 3. Visit /en/academy/order-flow-footprints/delta-la-gi (en URL + vi slug)
 *    → fallback banner appears, content stays readable.
 * 4. Screenshots saved for visual verification.
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "tools", "output");

const ADMIN_EMAIL = "admin@academy.local";
const ADMIN_PASSWORD = process.env.SMOKE_PASSWORD ?? "";
if (!ADMIN_PASSWORD) {
  console.error("Set SMOKE_PASSWORD before running.");
  process.exit(2);
}

let failed = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
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

  console.log("\n[1] Guest landing — modules + trending");
  await page.goto(`${BASE}/en/academy`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(OUT, "p3-1-landing-en.png"),
    fullPage: true,
  });
  const hasOrderFlow = await page
    .locator('text="Order Flow Footprints"')
    .first()
    .isVisible();
  check("Order Flow Footprints module visible", hasOrderFlow, "");
  const hasDeltaTrending = await page
    .locator('button:has-text("DELTA")')
    .first()
    .isVisible();
  check("Trending DELTA pill visible", hasDeltaTrending, "");

  console.log("\n[2] Guest module page");
  await page.goto(`${BASE}/en/academy/order-flow-footprints`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(OUT, "p3-2-module-en.png"),
    fullPage: true,
  });
  const hasArticleCard = await page
    .locator("text=/Delta explained/i")
    .first()
    .isVisible();
  check("Delta article card visible", hasArticleCard, "");

  console.log("\n[3] Guest article detail");
  await page.goto(
    `${BASE}/en/academy/order-flow-footprints/delta-explained`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(OUT, "p3-3-article-en.png"),
    fullPage: true,
  });
  const hasH2 = await page
    .locator('h2:has-text("What delta actually measures")')
    .isVisible();
  check("MDX H2 rendered", hasH2, "");
  const hasCodeBlock = await page.locator("pre code").first().isVisible();
  check("Code block rendered", hasCodeBlock, "");
  const hasToc = await page
    .locator('aside:has-text("On this page")')
    .isVisible();
  check("TOC sidebar present", hasToc, "");

  console.log("\n[4] Login → VI article");
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !new URL(u).pathname.endsWith("/login"), {
      timeout: 15_000,
    }),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(`${BASE}/vi/academy/order-flow-footprints/delta-la-gi`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(OUT, "p3-4-article-vi.png"),
    fullPage: true,
  });
  const hasViH1 = await page.locator("h1").first().textContent();
  check(
    "VI H1 starts with 'Delta là gì'",
    !!hasViH1 && hasViH1.toLowerCase().includes("delta là gì"),
    `h1=${hasViH1?.slice(0, 60)}`,
  );
  const noFallback = !(await page
    .locator('text="đang hiển thị"')
    .first()
    .isVisible()
    .catch(() => false));
  check("VI page has no fallback banner", noFallback, "");

  console.log("\n[5] Canonical redirect — VI slug on /en URL");
  await page.goto(`${BASE}/en/academy/order-flow-footprints/delta-la-gi`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, "p3-5-canonical.png"),
    fullPage: true,
  });
  const finalPath = new URL(page.url()).pathname;
  check(
    "VI slug on /en URL redirects to canonical EN slug",
    finalPath === "/en/academy/order-flow-footprints/delta-explained",
    `landed on ${finalPath}`,
  );

  await browser.close();
  console.log(
    failed === 0
      ? "\n[smoke] ALL PASS"
      : `\n[smoke] ${failed} CHECK(S) FAILED`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

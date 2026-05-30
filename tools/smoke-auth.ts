/**
 * Phase 2 smoke test — verifies the auth contract end-to-end.
 *
 * 1. Guest hitting /vi/academy is redirected to /en/academy (PUBLIC_LOCALE rule).
 * 2. Guest hitting /en/admin is redirected to /en/login.
 * 3. Login with seeded admin credentials succeeds.
 * 4. After login, /en/admin no longer redirects.
 * 5. After login, /vi/academy stays /vi/academy (no public-locale forcing).
 *
 * Run with: pnpm tsx tools/smoke-auth.ts
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "tools", "output");

const ADMIN = {
  email: process.env.SMOKE_EMAIL ?? "admin@academy.local",
  password: process.env.SMOKE_PASSWORD ?? "",
};

if (!ADMIN.password) {
  console.error(
    "Set SMOKE_PASSWORD env var to the seeded admin password before running.",
  );
  process.exit(2);
}

let failed = 0;
function check(label: string, actual: string, expected: string | RegExp) {
  const ok =
    expected instanceof RegExp ? expected.test(actual) : actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${label} → ${actual}`);
  if (!ok) failed++;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  console.log("\n[1] Guest /vi/academy should be forced to /en/academy");
  await page.goto(`${BASE}/vi/academy`, { waitUntil: "networkidle" });
  check("guest /vi/academy URL", new URL(page.url()).pathname, "/en/academy");
  await page.screenshot({ path: join(OUT, "smoke-1-guest-vi-redirect.png") });

  console.log("\n[2] Guest /en/admin should redirect to /en/login");
  await page.goto(`${BASE}/en/admin`, { waitUntil: "networkidle" });
  check(
    "guest /en/admin URL",
    new URL(page.url()).pathname,
    "/en/login",
  );
  await page.screenshot({ path: join(OUT, "smoke-2-guest-admin-redirect.png") });

  console.log("\n[3] Submitting login form…");
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await Promise.all([
    page.waitForURL(
      (u) => !new URL(u).pathname.endsWith("/login"),
      { timeout: 15_000 },
    ),
    page.click('button[type="submit"]'),
  ]);
  check("post-login URL", new URL(page.url()).pathname, /\/en\/(academy)?$/);
  await page.screenshot({ path: join(OUT, "smoke-3-post-login.png") });

  console.log("\n[4] Authed /en/admin should NOT redirect to /en/login");
  await page.goto(`${BASE}/en/admin`, { waitUntil: "networkidle" });
  // /admin doesn't exist yet (Phase 4), but the middleware shouldn't kick us to /login.
  check(
    "authed /en/admin URL stays out of login",
    new URL(page.url()).pathname,
    /^\/en\/admin/,
  );
  await page.screenshot({ path: join(OUT, "smoke-4-authed-admin.png") });

  console.log("\n[5] Authed /vi/academy stays /vi/academy");
  await page.goto(`${BASE}/vi/academy`, { waitUntil: "networkidle" });
  check(
    "authed /vi/academy URL",
    new URL(page.url()).pathname,
    "/vi/academy",
  );
  await page.screenshot({ path: join(OUT, "smoke-5-authed-vi.png") });

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

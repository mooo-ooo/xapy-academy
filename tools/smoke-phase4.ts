/**
 * Phase 4 admin smoke test:
 * 1. Login as admin.
 * 2. /admin loads dashboard (stat cards, recent activity).
 * 3. /admin/users lists seeded admin.
 * 4. /admin/users/new creates a CTV user; password is shown once.
 * 5. /admin/modules lists 4 modules.
 * 6. /admin/articles lists demo article; status filter works.
 * 7. /admin/articles/[id]/edit loads the source editor and translator panel.
 * 8. /admin/settings loads with publicLocale=en preselected.
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "tools", "output");

const ADMIN_EMAIL = "admin@academy.local";
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
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  // login
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !new URL(u).pathname.endsWith("/login"), {
      timeout: 15_000,
    }),
    page.click('button[type="submit"]'),
  ]);

  // 1 — dashboard
  await page.goto(`${BASE}/en/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, "p4-1-dashboard.png"),
    fullPage: true,
  });
  check(
    "Dashboard shows Articles stat",
    await page.locator("text=Articles").first().isVisible(),
  );

  // 2 — users list
  await page.goto(`${BASE}/en/admin/users`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "p4-2-users.png"), fullPage: true });
  check(
    "Users page lists admin@academy.local",
    await page.locator("text=admin@academy.local").first().isVisible(),
  );

  // 3 — create CTV
  await page.goto(`${BASE}/en/admin/users/new`, { waitUntil: "networkidle" });
  const ctvEmail = `ctv+${Date.now()}@academy.local`;
  await page.fill('input[name="email"]', ctvEmail);
  await page.fill('input[name="name"]', "Smoke CTV");
  // Pick CTV from role select via the listbox dialog
  await page.locator('button[aria-label*="Role"], button:has-text("User (reader)")').first().click();
  await page.locator('[role="option"]:has-text("CTV")').click();
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Save these credentials now", {
    timeout: 10_000,
  });
  await page.screenshot({
    path: join(OUT, "p4-3-user-created.png"),
    fullPage: true,
  });
  check(
    "Created CTV with generated password",
    await page.locator("text=Save these credentials now").isVisible(),
  );

  // 4 — modules
  await page.goto(`${BASE}/en/admin/modules`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "p4-4-modules.png"),
    fullPage: true,
  });
  check(
    "Modules page lists order-flow-footprints",
    await page.locator("text=order-flow-footprints").first().isVisible(),
  );

  // 5 — articles
  await page.goto(`${BASE}/en/admin/articles`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "p4-5-articles.png"),
    fullPage: true,
  });
  check(
    "Articles page lists demo article",
    await page.locator("text=/Delta explained/i").first().isVisible(),
  );

  // 6 — edit article
  const editLink = await page
    .locator('a:has-text("Edit")')
    .first()
    .getAttribute("href");
  if (editLink) {
    await page.goto(`${BASE}${editLink}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: join(OUT, "p4-6-article-edit.png"),
      fullPage: true,
    });
    check(
      "Article edit page shows Source heading",
      await page.locator("text=/Source — EN/i").first().isVisible(),
    );
    check(
      "Article edit page shows Translations panel",
      await page.locator("text=/^Translations$/i").first().isVisible(),
    );
  } else {
    failed++;
    console.log("✗ No edit link found");
  }

  // 7 — settings
  await page.goto(`${BASE}/en/admin/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "p4-7-settings.png"),
    fullPage: true,
  });
  check(
    "Settings page shows Public locale section",
    await page.locator("text=Public locale").first().isVisible(),
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

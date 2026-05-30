import { chromium } from "playwright";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "tools", "output");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await ctx.newPage();

  // Login form (public)
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "form-1-login.png"), fullPage: true });

  // Login to access admin forms
  await page.fill('input[name="email"]', "admin@academy.local");
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !new URL(u).pathname.endsWith("/login"), {
      timeout: 10_000,
    }),
    page.click('button[type="submit"]'),
  ]);

  // New user form
  await page.goto(`${BASE}/en/admin/users/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "form-2-new-user.png"), fullPage: true });

  // New article form + auto-slug demo
  await page.goto(`${BASE}/en/admin/articles/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.fill('input[name="title"]', "Đọc Delta nâng cao: footprint imbalance");
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, "form-3-new-article-autoslug.png"), fullPage: true });

  // Settings form
  await page.goto(`${BASE}/en/admin/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "form-4-settings.png"), fullPage: true });

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

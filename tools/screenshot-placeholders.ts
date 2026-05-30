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

  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "ph-login.png"), fullPage: true });

  await page.fill('input[name="email"]', "admin@academy.local");
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !new URL(u).pathname.endsWith("/login"), {
      timeout: 10_000,
    }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/en/admin/users/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "ph-new-user.png"), fullPage: true });

  await page.goto(`${BASE}/en/admin/articles/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "ph-new-article.png"), fullPage: true });

  await page.goto(`${BASE}/en/admin/modules/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "ph-new-module.png"), fullPage: true });

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

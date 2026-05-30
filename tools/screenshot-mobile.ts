import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), "tools", "output");

const ROUTES = [
  "/en/academy",
  "/en/academy/order-flow-footprints",
  "/en/academy/order-flow-footprints/delta-explained",
  "/en/login",
  "/en/search?q=delta",
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    console.log(`[shot] ${route}`);
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(1200);
    const safe = route.replace(/\//g, "_").replace(/^_/, "").replace(/\?/g, "-").replace(/=/g, "-");
    await page.screenshot({
      path: join(OUT, `mobile-${safe}.png`),
      fullPage: true,
    });
  }
  await browser.close();
  console.log("[shot] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

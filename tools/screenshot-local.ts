import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  for (const route of ["/en/academy", "/vi/academy"]) {
    const url = `http://localhost:3000${route}`;
    console.log(`[shot] ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    const safe = route.replace(/\//g, "_").replace(/^_/, "");
    await page.screenshot({
      path: join(OUT, `local-${safe}-fold.png`),
      fullPage: false,
    });
    await page.screenshot({
      path: join(OUT, `local-${safe}-full.png`),
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

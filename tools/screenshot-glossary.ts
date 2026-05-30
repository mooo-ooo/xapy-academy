import { chromium } from "playwright";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/en/academy/glossary", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(OUT, "cleanup-glossary-en.png"),
    fullPage: true,
  });
  await browser.close();
}

main();

import { chromium } from "playwright";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1440, height: 1200 },
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/en/academy", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: join(OUT, "after-crawl-landing.png"),
    fullPage: true,
  });
  await browser.close();
  console.log("done");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

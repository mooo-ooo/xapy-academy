import { chromium } from "playwright";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await ctx.newPage();

  await page.goto("http://localhost:3000/en/academy", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(OUT, "rebuild-landing-full.png"),
    fullPage: true,
  });

  await page.goto(
    "http://localhost:3000/en/academy/order-flow-footprints/delta-explained",
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(OUT, "rebuild-detail-full.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("done");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

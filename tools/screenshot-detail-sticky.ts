import { chromium } from "playwright";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(
    "http://localhost:3000/vi/academy/options-greeks/options-greeks-a-simple-introduction-mjwwr6ird8t799",
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(OUT, "local-detail-top.png"),
    fullPage: false,
  });
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "local-detail-scrolled.png"),
    fullPage: false,
  });

  const navInfo = await page.evaluate(() => {
    const nav = document.querySelector("nav.academy-navbar-sticky");
    if (!nav) return null;
    const cs = getComputedStyle(nav);
    const r = nav.getBoundingClientRect();
    return {
      position: cs.position,
      top: cs.top,
      backdropFilter: cs.backdropFilter,
      background: cs.backgroundColor,
      height: r.height,
      rectTop: r.top,
    };
  });
  console.log("nav after scroll:", JSON.stringify(navInfo, null, 2));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

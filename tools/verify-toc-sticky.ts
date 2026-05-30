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

  // Scroll 1500px so the TOC has had time to need sticking
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const aside = Array.from(document.querySelectorAll("aside"))
      .find((a) => a.querySelectorAll("a[href^='#']").length >= 3);
    if (!aside) return { found: false };
    const cs = getComputedStyle(aside);
    const r = aside.getBoundingClientRect();
    return {
      found: true,
      position: cs.position,
      top: cs.top,
      rectTop: r.top,
      rectBottom: r.bottom,
      heightFit: aside.scrollHeight,
      viewportH: window.innerHeight,
    };
  });
  console.log("toc aside after scroll(1500):", JSON.stringify(info, null, 2));

  await page.screenshot({
    path: join(OUT, "local-toc-sticky-scrolled.png"),
    fullPage: false,
  });

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

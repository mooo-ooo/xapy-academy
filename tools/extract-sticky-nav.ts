/**
 * Extract the computed styles for kiyotaka.ai's sticky navbar on a
 * detail page so we can pixel-match the site header on our detail page.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(
    "https://kiyotaka.ai/academy/guide/options-greeks-a-simple-introduction-mjwwr6ird8t799",
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(1500);

  // Take baseline screenshot at top
  await page.screenshot({
    path: join(OUT, "kiyo-detail-top.png"),
    fullPage: false,
  });

  // Scroll to mid-page and capture sticky nav
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, "kiyo-detail-scrolled.png"),
    fullPage: false,
  });

  const info = await page.evaluate(() => {
    // Look for the academy navbar
    const navCandidates = Array.from(
      document.querySelectorAll(
        'nav, header, [class*="navbar"], [class*="nav-"], [class*="academy-nav"]',
      ),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < 100 && r.width > 800; // top-area, wide
    });

    return navCandidates.slice(0, 5).map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el as HTMLElement).className,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        position: cs.position,
        top: cs.top,
        zIndex: cs.zIndex,
        background: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        backdropFilter: cs.backdropFilter,
        borderBottom: cs.borderBottom,
        boxShadow: cs.boxShadow,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        height: cs.height,
        transition: cs.transition,
        outerHtmlHead: (el as HTMLElement).outerHTML.slice(0, 600),
      };
    });
  });

  writeFileSync(join(OUT, "kiyo-sticky-nav.json"), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

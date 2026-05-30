/**
 * Probe: does the live kiyotaka.ai/academy page fetch more guides on
 * scroll (infinite scroll), or load everything up front / paginate by
 * page clicks?
 *
 * Records every /academy-guides/ API call with its cursor/limit, scrolls
 * to the bottom in 4 steps, and prints the sequence so we can read it.
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  const calls: Array<{ url: string; ts: number }> = [];
  const t0 = Date.now();
  page.on("request", (req) => {
    if (req.url().includes("academy-guides")) {
      calls.push({ url: req.url(), ts: Date.now() - t0 });
    }
  });

  await page.goto("https://kiyotaka.ai/academy/", {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  console.log(`[t+${Date.now() - t0}ms] initial load complete`);

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
    await page.waitForTimeout(1500);
    console.log(
      `[t+${Date.now() - t0}ms] after scroll ${i + 1} — total calls so far: ${calls.length}`,
    );
  }

  // Final dump
  console.log("\n=== /academy-guides/ network calls ===");
  for (const c of calls) {
    console.log(`  ${c.ts.toString().padStart(6)}ms  ${c.url}`);
  }

  // Count cards rendered
  const cards = await page.$$eval(
    "[class*='academy-guide'], .academy-guide-card, article",
    (els) => els.length,
  );
  console.log(`\nGuide elements in DOM: ${cards}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

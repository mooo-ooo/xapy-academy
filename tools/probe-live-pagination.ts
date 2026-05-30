/**
 * Probe how the live kiyotaka.ai/academy sub-pages paginate (module,
 * search, glossary). Records every API call as we visit + scroll each.
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
  });
  const page = await ctx.newPage();

  async function visit(url: string, label: string) {
    const calls: string[] = [];
    const off = (req: { url: () => string }) => {
      const u = req.url();
      if (u.includes("/api/v1/")) calls.push(u.replace(/^https?:\/\/[^/]+/, ""));
    };
    page.on("request", off);
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
      await page.waitForTimeout(1200);
    }
    page.off("request", off);
    console.log(`\n=== ${label}  ${url} ===`);
    for (const u of calls) console.log(`  ${u}`);
    console.log(`  total API calls: ${calls.length}`);
  }

  await visit("https://kiyotaka.ai/academy/order-flow-footprints", "MODULE");
  await visit("https://kiyotaka.ai/academy/?q=delta", "SEARCH/ROOT");
  await visit("https://kiyotaka.ai/academy/glossary", "GLOSSARY");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

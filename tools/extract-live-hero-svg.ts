/**
 * Second pass: dump the full SVG outerHTML for .robot-learning-svg, plus
 * every CSS rule whose selector mentions a robot-* class, so we can replicate
 * shapes + animations 1:1 locally.
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output", "live-hero");
const URL = "https://kiyotaka.ai/academy/";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 45_000 });

  const svgHtml = await page.evaluate(() => {
    const el = document.querySelector(".robot-learning-svg") as SVGElement | null;
    return el?.outerHTML ?? null;
  });

  // Collect every CSS rule (text + selector) whose selector mentions any
  // class we care about (robot-*, particle-, hero, or animation utility names).
  const css = await page.evaluate(() => {
    const wanted = /\b(robot-|particle-canvas|hero-|book|eye|antenna|knowledge|spark|orbit)/i;
    const out: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      if (!rules) continue;
      for (const r of Array.from(rules)) {
        if (r instanceof CSSStyleRule && wanted.test(r.selectorText)) {
          out.push(r.cssText);
        }
      }
    }
    return out;
  });

  // Also dump any keyframes that the matched rules reference, so we have a
  // self-contained replication kit. (Already in the earlier report.json, but
  // pinning them here for completeness.)
  await writeFile(join(OUT, "robot.svg"), svgHtml ?? "(not found)", "utf8");
  await writeFile(join(OUT, "robot.css"), css.join("\n\n"), "utf8");

  console.log("[extract-svg] svg bytes:", svgHtml?.length ?? 0);
  console.log("[extract-svg] css rules:", css.length);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

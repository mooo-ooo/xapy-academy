/**
 * One-off: probe https://kiyotaka.ai/academy/ to understand the hero
 * illustration. Captures (1) outerHTML of the right-side visual, (2) any
 * external animation assets (Lottie JSON, video, image), (3) keyframes
 * referenced by computed styles, (4) PNG screenshots at frame 0/500/1500ms
 * so we can see if it's actually animated.
 *
 *   pnpm tsx tools/extract-live-hero.ts
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output", "live-hero");
const URL = "https://kiyotaka.ai/academy/";

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  const assets: Array<{ url: string; type: string; status: number }> = [];
  page.on("response", (res) => {
    const ct = res.headers()["content-type"] ?? "";
    if (/(json|lottie|video|image|webm|mp4|gif|svg)/i.test(ct)) {
      assets.push({ url: res.url(), type: ct, status: res.status() });
    }
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 45_000 });

  // Frame screenshots — see if anything moves in the hero zone
  for (const t of [0, 500, 1500, 3000]) {
    await page.waitForTimeout(t === 0 ? 100 : 500);
    await page.screenshot({
      path: join(OUT, `hero-${t}ms.png`),
      clip: { x: 0, y: 0, width: 1280, height: 700 },
    });
  }

  // Inspect the DOM: find any element in the top 800px that looks like a
  // standalone illustration (svg / canvas / video / lottie / large img).
  const dom = await page.evaluate(() => {
    const probes: Array<Record<string, unknown>> = [];
    const candidates = Array.from(
      document.querySelectorAll(
        "svg, canvas, video, lottie-player, [class*='lottie'], img",
      ),
    ) as HTMLElement[];
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.top > 800 || r.width < 100 || r.height < 100) continue;
      const cs = getComputedStyle(el);
      probes.push({
        tag: el.tagName.toLowerCase(),
        className: el.className?.toString?.() ?? "",
        id: el.id,
        rect: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        src: (el as HTMLImageElement).src ?? null,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        transformOrigin: cs.transformOrigin,
        outerHTMLPreview: el.outerHTML.slice(0, 1200),
      });
    }
    return probes;
  });

  // Also dump the rendered HTML of the hero section so we can read it
  const heroHtml = await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const hero =
      main.querySelector("section") ??
      main.querySelector("header") ??
      main.firstElementChild;
    return hero?.outerHTML ?? "(no hero element found)";
  });

  // Stylesheet probe: list every @keyframes rule on the page
  const keyframes = await page.evaluate(() => {
    const all: Array<{ name: string; cssText: string }> = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // CORS-blocked stylesheet
      }
      if (!rules) continue;
      for (const r of Array.from(rules)) {
        if (r instanceof CSSKeyframesRule) {
          all.push({ name: r.name, cssText: r.cssText.slice(0, 600) });
        }
      }
    }
    return all;
  });

  await writeFile(
    join(OUT, "report.json"),
    JSON.stringify({ url: URL, assets, dom, keyframes }, null, 2),
    "utf8",
  );
  await writeFile(join(OUT, "hero.html"), heroHtml, "utf8");

  console.log("[extract] done →", OUT);
  console.log("  dom candidates:", dom.length);
  console.log("  network assets:", assets.length);
  console.log("  keyframes:", keyframes.length);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

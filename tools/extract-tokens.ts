/**
 * Pixel token extractor for kiyotaka.ai/academy
 *
 * Usage: pnpm extract:tokens
 * Output: tools/output/tokens.json + screenshots
 *
 * Strategy: launch headless Chromium, navigate to the target,
 * inject a script that walks key elements and dumps their
 * getComputedStyle into JSON. Also captures element bounding boxes
 * and full-page screenshots at desktop + mobile viewports.
 */

import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = "https://kiyotaka.ai/academy/";
const OUT = join(process.cwd(), "tools", "output");

// Properties we care about for every element
const PROPS = [
  // Color
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  // Typography
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textDecoration",
  // Box model
  "width",
  "height",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "borderRadius",
  "borderWidth",
  "borderStyle",
  // Effects
  "boxShadow",
  "filter",
  "backdropFilter",
  "opacity",
  "transform",
  // Layout
  "display",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "gap",
  "position",
] as const;

// Selectors to probe. Add to this list as we discover more.
// Each entry: [label, selector, fallback selector?]
const TARGETS: Array<[label: string, selectors: string[]]> = [
  ["body", ["body"]],
  ["html", ["html"]],
  ["header", ["header", "nav"]],
  ["logo", ["header svg", "nav svg", "a[href='/'] svg"]],
  ["heroTitle", ["h1"]],
  ["heroSubtitle", ["h1 + p", "main p"]],
  ["searchWrapper", ["form", "div:has(> input[type='text'])"]],
  ["searchInput", ["input[type='text']", "input[type='search']"]],
  ["searchSubmit", ["form button", "button[type='submit']"]],
  ["trendingLabel", ["span:has(svg)"]],
  ["trendingLink", ["a[href*='#']"]],
  ["submitGuideBtn", ["button:has-text('Submit')", "a:has-text('Submit Guide')"]],
  ["loginBtn", ["button:has-text('Log In')", "a:has-text('Log In')"]],
  ["themeBtn", ["header button:has(svg)"]],
  ["moduleNavAll", ["a:has-text('All Modules')", "button:has-text('All Modules')"]],
  ["moduleNavItem", ["a:has-text('Order Flow')", "button:has-text('Order Flow')"]],
];

type ComputedDump = Record<string, string>;
type ElementSnapshot = {
  selectorTried: string;
  selectorMatched: string | null;
  count: number;
  rect: { x: number; y: number; width: number; height: number } | null;
  computed: ComputedDump | null;
  innerText: string | null;
};

async function probe(
  page: Page,
  selectors: string[],
): Promise<ElementSnapshot> {
  for (const sel of selectors) {
    const result = await page.evaluate(
      ({ sel, props }) => {
        let el: Element | null = null;
        try {
          el = document.querySelector(sel);
        } catch {
          return { found: false };
        }
        if (!el) return { found: false };
        const cs = window.getComputedStyle(el);
        const dump: Record<string, string> = {};
        for (const p of props) {
          // Prefer indexed/named access (always returns computed value);
          // fall back to kebab-case getPropertyValue.
          const kebab = p.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
          const v =
            (cs as unknown as Record<string, string>)[p] ??
            cs.getPropertyValue(kebab);
          dump[p] = v ?? "";
        }
        const r = el.getBoundingClientRect();
        return {
          found: true,
          rect: {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          },
          computed: dump,
          innerText: (el as HTMLElement).innerText?.slice(0, 200) ?? null,
          count: document.querySelectorAll(sel).length,
        };
      },
      { sel, props: PROPS as unknown as string[] },
    );
    if (result.found) {
      return {
        selectorTried: selectors.join(" | "),
        selectorMatched: sel,
        count: result.count!,
        rect: result.rect!,
        computed: result.computed!,
        innerText: result.innerText!,
      };
    }
  }
  return {
    selectorTried: selectors.join(" | "),
    selectorMatched: null,
    count: 0,
    rect: null,
    computed: null,
    innerText: null,
  };
}

async function dumpKeyframes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const rules: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          if (rule.constructor.name === "CSSKeyframesRule") {
            rules.push((rule as CSSKeyframesRule).cssText);
          }
        }
      } catch {
        // CORS-blocked stylesheet — skip
      }
    }
    return rules;
  });
}

async function dumpRootVars(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (name.startsWith("--")) out[name] = cs.getPropertyValue(name).trim();
    }
    return out;
  });
}

async function captureAt(
  page: Page,
  label: string,
  width: number,
  height: number,
) {
  await page.setViewportSize({ width, height });
  await page.goto(TARGET, { waitUntil: "networkidle", timeout: 60_000 });
  // Wait for fade-in animations
  await page.waitForTimeout(2_500);

  const snapshots: Record<string, ElementSnapshot> = {};
  for (const [labelTgt, selectors] of TARGETS) {
    snapshots[labelTgt] = await probe(page, selectors);
  }

  const keyframes = await dumpKeyframes(page);
  const rootVars = await dumpRootVars(page);

  const fullPath = join(OUT, `screenshot-${label}-full.png`);
  const foldPath = join(OUT, `screenshot-${label}-fold.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  await page.screenshot({ path: foldPath, fullPage: false });

  // Also save outer HTML of header + main for structural reference
  const headerHtml = await page
    .locator("header, nav")
    .first()
    .evaluate((el) => el.outerHTML)
    .catch(() => null);
  const mainHtml = await page
    .locator("main, h1")
    .first()
    .evaluate((el) => el.closest("section, main, body")?.outerHTML ?? null)
    .catch(() => null);

  return {
    label,
    viewport: { width, height },
    target: TARGET,
    capturedAt: new Date().toISOString(),
    snapshots,
    rootCssVariables: rootVars,
    keyframeRulesCount: keyframes.length,
    keyframeRules: keyframes,
    headerHtml,
    mainHtml,
    screenshots: {
      full: fullPath,
      fold: foldPath,
    },
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log(`[extract] launching chromium…`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  const desktop = await captureAt(page, "desktop-1280", 1280, 800);
  const wide = await captureAt(page, "desktop-1920", 1920, 1080);
  const mobile = await captureAt(page, "mobile-iphone-375", 375, 812);

  await writeFile(
    join(OUT, "tokens.json"),
    JSON.stringify({ desktop, wide, mobile }, null, 2),
    "utf8",
  );

  console.log(`[extract] wrote tokens.json + 6 screenshots → ${OUT}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Deeper crawl of kiyotaka.ai/academy — capture the article-card grid
 * (the part our current build is far from matching) and the chip nav.
 *
 * Outputs:
 *   tools/output/cards.json   — per-element computed styles + rects + text
 *   tools/output/cards-*.png  — focused crops
 *
 * NOTE: page.evaluate only accepts STRINGIFIABLE bodies — we keep all
 * helper logic inline to avoid the `__name` bundler shim leaking in.
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = "https://kiyotaka.ai/academy/";
const OUT = join(process.cwd(), "tools", "output");

const PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderColor",
  "borderRadius",
  "borderWidth",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
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
  "boxShadow",
  "filter",
  "backdropFilter",
  "opacity",
  "display",
  "gridTemplateColumns",
  "flexDirection",
  "gap",
  "width",
  "height",
  "aspectRatio",
  "objectFit",
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1440, height: 1200 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();
  await page.goto(TARGET, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: join(OUT, "cards-fullpage.png"),
    fullPage: true,
  });

  // Use addInitScript / page.evaluateHandle alternative: send a STRING body.
  const probeBody = (props: string[]) => `
    (function() {
      const PROPS = ${JSON.stringify(props)};
      function styleOf(el) {
        const cs = window.getComputedStyle(el);
        const out = {};
        for (const p of PROPS) out[p] = cs[p] || "";
        const r = el.getBoundingClientRect();
        return {
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          computed: out,
          tag: el.tagName.toLowerCase(),
          cls: (el.className && el.className.toString ? el.className.toString() : "").slice(0, 200),
          text: (el.innerText || "").slice(0, 200),
        };
      }
      function walkUpToCard(start) {
        let n = start;
        for (let i = 0; i < 8 && n; i++) {
          if (n.tagName === "ARTICLE" || n.tagName === "LI") return n;
          if (n.tagName === "A" && n.querySelector("img")) return n;
          const cls = ((n.className && n.className.toString) ? n.className.toString() : "").toLowerCase();
          if (/card|tile|item|guide/.test(cls) && n.querySelector("h1,h2,h3,h4")) return n;
          n = n.parentElement;
        }
        return start;
      }

      const titles = Array.from(document.querySelectorAll("h1,h2,h3,h4")).filter(el =>
        /Time Price Opportunity|Orderbook Heatmaps|Volume Footprints/i.test(el.textContent || "")
      );
      const cards = titles.map(t => walkUpToCard(t)).filter(Boolean).slice(0, 3);

      const cardSamples = cards.map(card => {
        const title = card.querySelector("h1,h2,h3,h4");
        const img = card.querySelector("img, picture, video");
        const badge = Array.from(card.querySelectorAll("span, div")).find(el =>
          /^[A-Z& ]+$/.test((el.textContent || "").trim().slice(0, 50))
        );
        const desc = Array.from(card.querySelectorAll("p, div")).find(el =>
          (el.textContent || "").length > 40 && el !== title && (!title || !title.contains(el))
        );
        const time = Array.from(card.querySelectorAll("span, div")).find(el =>
          /\\d+\\s*min/i.test(el.textContent || "")
        );
        const heart = Array.from(card.querySelectorAll("svg")).find(svg => {
          const path = svg.querySelector("path");
          const d = path ? path.getAttribute("d") || "" : "";
          return /heart/i.test(svg.outerHTML) || d.includes("a3 3");
        });
        const author = Array.from(card.querySelectorAll("span, div, a")).find(el =>
          /kiyotaka/i.test(el.textContent || "")
        );
        return {
          cardCls: (card.className && card.className.toString ? card.className.toString() : ""),
          card: styleOf(card),
          title: title ? styleOf(title) : null,
          img: img ? styleOf(img) : null,
          imgSrc: img ? (img.getAttribute("src") || img.getAttribute("srcset") || "") : null,
          badge: badge ? styleOf(badge) : null,
          desc: desc ? styleOf(desc) : null,
          time: time ? styleOf(time) : null,
          heart: heart ? styleOf(heart) : null,
          author: author ? styleOf(author) : null,
        };
      });

      const chipLabels = ["All Modules","Order Flow","Footprints","TPO & Profile","Technical Analysis","Psychology","View All Topics"];
      const chips = chipLabels.map(label => {
        const el = Array.from(document.querySelectorAll("button, a, span, div"))
          .find(e => (e.textContent || "").trim() === label);
        if (!el) return { label, present: false };
        return {
          label,
          present: true,
          style: styleOf(el),
          svgOuter: el.querySelector("svg") ? el.querySelector("svg").outerHTML.slice(0,600) : null,
          parentDisplay: el.parentElement ? window.getComputedStyle(el.parentElement).display : "",
        };
      });

      const trendLabels = ["DELTA","VWAP","LIQUIDITY","TRENDING"];
      const trending = trendLabels.map(label => {
        const el = Array.from(document.querySelectorAll("a, span, button"))
          .find(e => (e.textContent || "").trim() === label || (e.textContent || "").includes(label));
        return el ? { label, style: styleOf(el) } : { label, missing: true };
      });

      let grid = null;
      const anyTitle = titles[0];
      let n = anyTitle ? anyTitle.parentElement : null;
      for (let i = 0; i < 12 && n; i++) {
        const cs = window.getComputedStyle(n);
        if (cs.display.indexOf("grid") >= 0 || (cs.display === "flex" && cs.flexWrap === "wrap")) {
          const r = n.getBoundingClientRect();
          const out = {};
          for (const p of PROPS) out[p] = cs[p] || "";
          grid = {
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
            computed: out,
            tag: n.tagName.toLowerCase(),
            cls: (n.className && n.className.toString ? n.className.toString() : ""),
            childCount: n.children.length,
          };
          break;
        }
        n = n.parentElement;
      }

      // sample HTML of first card for structure reference
      const cardSampleHtml = cards[0] ? cards[0].outerHTML.slice(0, 8000) : null;

      // sample HTML of chip strip
      const allChip = Array.from(document.querySelectorAll("button, a")).find(el =>
        /All Modules/i.test(el.textContent || "")
      );
      const chipStrip = allChip ? allChip.closest('[class*="rounded"], [role="tablist"], nav, div') : null;
      const chipHtml = chipStrip ? chipStrip.outerHTML.slice(0, 4000) : null;

      return { cardSamples, chips, trending, grid, cardSampleHtml, chipHtml };
    })();
  `;

  const result = (await page.evaluate(probeBody(PROPS))) as Record<
    string,
    unknown
  >;

  await writeFile(
    join(OUT, "cards.json"),
    JSON.stringify(
      {
        target: TARGET,
        capturedAt: new Date().toISOString(),
        ...result,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[extract-cards] wrote ${join(OUT, "cards.json")}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

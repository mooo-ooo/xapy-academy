/**
 * Targeted crawl of the kiyotaka.ai article-detail surface — captures
 * every element the user flagged in their feedback:
 *   - Category badge (rounded pill above the H1)
 *   - Author bar (gradient avatar + name + date)
 *   - Left sticky rail (like + share)
 *   - Right TOC sidebar with numbered hierarchical entries
 *   - Section headings with horizontal rule beneath
 *
 * Run: pnpm tsx tools/extract-detail-v2.ts
 * Output: tools/output/detail-v2.json + a full-page screenshot.
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const URL =
  "https://kiyotaka.ai/academy/guide/derivative-data-essentials-part-2-miwrdq05bky6p3";
const OUT = join(process.cwd(), "tools", "output");

const PROPS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderColor",
  "borderRadius",
  "borderWidth",
  "borderTop",
  "borderBottom",
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
  "opacity",
  "display",
  "position",
  "top",
  "left",
  "right",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "gap",
  "width",
  "height",
  "maxWidth",
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    viewport: { width: 1440, height: 1200 },
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: join(OUT, "detail-v2-fullpage.png"),
    fullPage: true,
  });

  const probe = `(function(){
    var PROPS = ${JSON.stringify(PROPS)};
    function styleOf(el){
      if(!el) return null;
      var cs=window.getComputedStyle(el); var out={};
      for(var i=0;i<PROPS.length;i++){ var p=PROPS[i]; out[p]=cs[p]||""; }
      var r=el.getBoundingClientRect();
      return {
        rect:{x:r.x,y:r.y,width:r.width,height:r.height},
        computed:out,
        tag:el.tagName.toLowerCase(),
        cls:(el.className&&el.className.toString?el.className.toString():"").slice(0,200),
        text:(el.innerText||"").slice(0,200)
      };
    }

    var h1 = document.querySelector("h1");
    var subtitle = null;
    if (h1 && h1.parentElement) {
      var sib = h1.nextElementSibling;
      while (sib) {
        if (sib.tagName === "P" || (sib.children.length === 0 && sib.textContent && sib.textContent.length > 30)) {
          subtitle = sib;
          break;
        }
        sib = sib.nextElementSibling;
      }
    }

    // Category badge: a pill above H1 with single-word uppercase content
    var badge = null;
    if (h1) {
      var prev = h1.previousElementSibling;
      while (prev && !badge) {
        if (/^[A-Z &/-]+$/.test((prev.textContent||"").trim().slice(0, 40))) {
          badge = prev;
        }
        prev = prev.previousElementSibling;
      }
      if (!badge) {
        // sometimes inside a wrapper - scan parent's first 3 children
        var p = h1.parentElement;
        if (p) {
          for (var i = 0; i < Math.min(p.children.length, 5); i++) {
            var c = p.children[i];
            if (c === h1) break;
            if (/^[A-Z &/-]+$/.test((c.textContent||"").trim().slice(0, 40))) {
              badge = c;
            }
          }
        }
      }
    }

    // Author bar — find the element containing 'BackQuant' or 'kiyotaka' near the header
    var authorBar = Array.from(document.querySelectorAll("header *, div, section *")).find(function(el){
      var t = (el.textContent || "").trim();
      return /BackQuant|kiyotaka/.test(t) && t.length < 80 && el.querySelector("span, div");
    });
    var authorAvatar = authorBar ? authorBar.querySelector("div, span") : null;

    // Sticky rail — element with position fixed/sticky on left containing heart icon
    var rail = null;
    var allSticky = Array.from(document.querySelectorAll("*")).filter(function(el){
      var cs = window.getComputedStyle(el);
      return (cs.position === "sticky" || cs.position === "fixed") &&
        (parseFloat(cs.left) < 100 || cs.left === "0px") &&
        el.querySelector("svg");
    });
    if (allSticky.length) rail = allSticky[0];

    // Right TOC — sticky element on right with "ON THIS PAGE" or a list of links
    var toc = null;
    var tocCandidate = Array.from(document.querySelectorAll("aside, nav, div")).find(function(el){
      return /On this page|ON THIS PAGE/i.test(el.textContent || "") && el.querySelector("a");
    });
    if (tocCandidate) toc = tocCandidate;

    // First H2 with a possible underline rule
    var h2 = document.querySelector("h2");
    var h2Rule = null;
    if (h2) {
      // Check if h2 has a border-bottom OR a following <hr>
      var cs = window.getComputedStyle(h2);
      var borderB = cs.borderBottomWidth;
      if (parseFloat(borderB) > 0) h2Rule = "border-bottom";
      var nextHr = h2.nextElementSibling;
      if (nextHr && nextHr.tagName === "HR") h2Rule = "next-hr";
    }

    return {
      url: location.href,
      h1: styleOf(h1),
      subtitle: styleOf(subtitle),
      badge: styleOf(badge),
      badgeText: badge ? (badge.textContent||"").trim() : null,
      authorBar: styleOf(authorBar),
      authorBarHtml: authorBar ? authorBar.outerHTML.slice(0, 1500) : null,
      authorAvatar: styleOf(authorAvatar),
      rail: styleOf(rail),
      railHtml: rail ? rail.outerHTML.slice(0, 1500) : null,
      toc: styleOf(toc),
      tocHtml: toc ? toc.outerHTML.slice(0, 3000) : null,
      h2: styleOf(h2),
      h2Rule: h2Rule,
      h2Outer: h2 ? h2.outerHTML.slice(0, 400) : null,
    };
  })();`;

  const result = await page.evaluate(probe);
  await writeFile(
    join(OUT, "detail-v2.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );

  console.log(`[extract-detail-v2] wrote detail-v2.json`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

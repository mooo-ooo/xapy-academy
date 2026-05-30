/**
 * Crawl 2 additional kiyotaka.ai surfaces:
 *   1. The article-detail page so we can compare title/meta/body
 *      typography against our /[locale]/academy/[m]/[s].
 *   2. The site footer (if any) — most of our layout has none yet.
 *
 * Targets the first guide link found on the academy index, then walks.
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "https://kiyotaka.ai/academy/";
const OUT = join(process.cwd(), "tools", "output");

const PROPS = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "padding",
  "margin",
  "boxShadow",
  "opacity",
  "display",
  "flexDirection",
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
  await page.goto(ROOT, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(2000);

  // Capture the academy header (logo, language buttons, etc.)
  await page.screenshot({
    path: join(OUT, "kiyo-academy-header.png"),
    clip: { x: 0, y: 0, width: 1440, height: 120 },
  });

  // Click the first guide card to get into a detail page (if it links).
  const firstHref = await page
    .locator('a:has(.academy-guide-content), a:has(h3)')
    .first()
    .getAttribute("href");
  let detailUrl: string | null = null;
  if (firstHref) {
    try {
      detailUrl = new URL(firstHref, ROOT).toString();
    } catch {
      detailUrl = null;
    }
  }

  let detailData: unknown = null;
  if (detailUrl && detailUrl !== ROOT) {
    console.log(`[detail] visiting ${detailUrl}`);
    await page.goto(detailUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(OUT, "kiyo-academy-detail.png"),
      fullPage: true,
    });

    const probe = `(function(){
      var PROPS = ${JSON.stringify(PROPS)};
      function styleOf(el){
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
      var h1=document.querySelector("h1");
      var subtitle=h1&&h1.parentElement?h1.parentElement.querySelector("p"):null;
      var body=document.querySelector("article, .academy-detail-body, [class*=prose], main");
      var heart=Array.from(document.querySelectorAll("svg")).find(function(svg){return /heart/i.test(svg.outerHTML);});
      var breadcrumb=document.querySelector("nav[aria-label*=breadcrumb i], nav ol");
      var footer=document.querySelector("footer");
      var headings=Array.from(document.querySelectorAll("h2, h3")).slice(0,6).map(styleOf);
      return {
        h1:h1?styleOf(h1):null,
        subtitle:subtitle?styleOf(subtitle):null,
        body:body?styleOf(body):null,
        heart:heart?styleOf(heart):null,
        breadcrumb:breadcrumb?styleOf(breadcrumb):null,
        footer:footer?styleOf(footer):null,
        headings:headings,
        bodySnippet:body?(body.innerText||"").slice(0,800):null,
        footerSnippet:footer?(footer.innerText||"").slice(0,800):null
      };
    })();`;
    detailData = (await page.evaluate(probe)) as unknown;
  }

  await writeFile(
    join(OUT, "detail.json"),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), detailUrl, detailData },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[extract-detail] wrote detail.json`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

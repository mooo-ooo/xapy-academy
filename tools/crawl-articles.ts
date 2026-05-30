/**
 * Crawl every guide from https://kiyotaka.ai/academy.
 *
 *   pnpm tsx tools/crawl-articles.ts
 *
 * Steps
 *   1. Visit the academy index, scroll to load all guide cards.
 *   2. Collect every /academy/guide/<slug> link.
 *   3. For each link: open in a fresh page, extract structured fields,
 *      convert the body HTML to Markdown via turndown, and append to
 *      tools/output/crawled-articles.json.
 *   4. Disk-cache per-URL so re-running is incremental — only new
 *      guides are fetched. Delete the cache dir to force a refresh.
 *
 * Output schema (one record per article):
 *   {
 *     url, slug, title, excerpt,
 *     category,      // e.g. "ORDER FLOW"
 *     authorName, authorInitial, publishedAtRaw,
 *     readingMinutes, difficulty, likeCount,
 *     coverImage,    // absolute URL or null
 *     bodyMd,        // turndown'd Markdown
 *   }
 *
 * No network politeness beyond a small per-request delay — Kiyotaka
 * is a public site and we're hitting ~10s of pages, not thousands.
 */

import { chromium } from "playwright";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import TurndownService from "turndown";

const ROOT = "https://kiyotaka.ai/academy/";
const OUT = join(process.cwd(), "tools", "output");
const CACHE = join(OUT, "crawl-cache");

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
td.addRule("strip-empty", {
  filter: (node) => {
    if (node.nodeName === "DIV" || node.nodeName === "SPAN") {
      return !node.textContent?.trim() && node.children.length === 0;
    }
    return false;
  },
  replacement: () => "",
});

type Crawled = {
  url: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  authorName: string | null;
  authorInitial: string | null;
  publishedAtRaw: string | null;
  readingMinutes: number | null;
  difficulty: string | null;
  likeCount: number | null;
  coverImage: string | null;
  bodyMd: string;
};

function cacheKey(url: string) {
  return createHash("sha1").update(url).digest("hex") + ".html";
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: 1,
    colorScheme: "dark",
    viewport: { width: 1440, height: 1200 },
    userAgent:
      "Mozilla/5.0 (compatible; AcademyClone/1.0; +https://github.com/) PlaywrightCrawler",
  });
  const page = await ctx.newPage();

  console.log(`[crawl] index → ${ROOT}`);
  await page.goto(ROOT, { waitUntil: "networkidle", timeout: 60_000 });
  // Scroll to trigger any lazy-loading.
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    return Array.from(
      new Set(
        anchors
          .map((a) => a.getAttribute("href") || "")
          .filter((h) => /\/academy\/guide\//.test(h)),
      ),
    );
  });
  console.log(`[crawl] found ${links.length} guide URLs`);

  const articles: Crawled[] = [];
  for (let i = 0; i < links.length; i++) {
    const raw = links[i];
    const url = new URL(raw, ROOT).toString();
    const cachePath = join(CACHE, cacheKey(url));

    let html: string;
    if (existsSync(cachePath)) {
      html = await readFile(cachePath, "utf8");
    } else {
      console.log(`[crawl ${i + 1}/${links.length}] ${url}`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(800);
      html = await page.content();
      await writeFile(cachePath, html, "utf8");
    }

    // Pull structured fields back out via a fresh evaluate against the
    // cached HTML. Easiest: set the page content and re-query.
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const probe = `(function(){
      function text(el){ return el ? (el.innerText || el.textContent || "").trim() : null; }
      function attr(el,name){ return el ? el.getAttribute(name) : null; }

      var h1 = document.querySelector("h1");
      var subtitle = h1 && h1.parentElement ? h1.parentElement.querySelector("p") : null;

      // Category pill — kiyotaka renders it as a small uppercase link/pill before the h1
      var pill = null;
      var ancestors = [];
      var n = h1 ? h1.parentElement : null;
      for (var i = 0; i < 4 && n; i++) ancestors.push(n), n = n.parentElement;
      ancestors.forEach(function(a){
        if (pill) return;
        var spans = a.querySelectorAll("a, span, div");
        for (var j = 0; j < spans.length; j++) {
          var s = spans[j];
          var t = (s.innerText || "").trim();
          if (t && /^[A-Z][A-Z0-9 &/-]+$/.test(t) && t.length < 40 && t.length > 2) {
            pill = t;
            break;
          }
        }
      });

      // Author block
      var authorEl = document.querySelector(".guide-author, [class*='author']");
      var authorName = null, authorInitial = null, publishedAtRaw = null;
      if (authorEl) {
        var nameEl = authorEl.querySelector(".guide-author-name, [class*='name']");
        var roleEl = authorEl.querySelector(".guide-author-role, [class*='role'], [class*='date'], time");
        var avatarEl = authorEl.querySelector("[class*='avatar-initial'], [class*='initial']");
        authorName = text(nameEl);
        publishedAtRaw = text(roleEl);
        authorInitial = text(avatarEl);
      }

      // Reading time + difficulty + likes (look for them globally)
      var minMatch = (document.body.innerText || "").match(/(\\d+)\\s*min/);
      var diffMatch = (document.body.innerText || "").match(/\\b(Beginner|Intermediate|Advanced)\\b/i);
      var heartCount = null;
      var heart = Array.from(document.querySelectorAll("svg")).find(function(svg){return /heart/i.test(svg.outerHTML);});
      if (heart) {
        var p = heart.parentElement;
        if (p) {
          var m = (p.innerText || "").match(/\\d+/);
          if (m) heartCount = parseInt(m[0], 10);
        }
      }

      // Cover image — prefer og:image, fallback to a banner img.
      var ogImage = attr(document.querySelector("meta[property='og:image']"), "content");
      var bannerImg = document.querySelector("img[src*='kiyotaka'], main img, article img");
      var coverImage = ogImage || (bannerImg ? bannerImg.getAttribute("src") : null);

      // Body — pick the longest <article> / [class*=guide-body] / main child.
      var candidates = Array.from(document.querySelectorAll(
        "article, .guide-body, .guide-content, [class*='guide-content'], main"
      ));
      var bodyEl = null;
      var bodyLen = 0;
      candidates.forEach(function(c){
        var len = (c.innerText || "").length;
        if (len > bodyLen) { bodyLen = len; bodyEl = c; }
      });
      // Strip the heading, author, TOC sidebar before serializing.
      var bodyHtml = "";
      if (bodyEl) {
        var clone = bodyEl.cloneNode(true);
        clone.querySelectorAll("nav, aside, .guide-author, .guide-toc, [class*='toc'], h1, .guide-header, [class*='guide-header'], [class*='breadcrumb']").forEach(function(x){ x.remove(); });
        bodyHtml = clone.innerHTML;
      }

      return {
        title: text(h1),
        excerpt: text(subtitle),
        category: pill,
        authorName: authorName,
        authorInitial: authorInitial,
        publishedAtRaw: publishedAtRaw,
        readingMinutes: minMatch ? parseInt(minMatch[1], 10) : null,
        difficulty: diffMatch ? diffMatch[1].toUpperCase() : null,
        likeCount: heartCount,
        coverImage: coverImage,
        bodyHtml: bodyHtml,
      };
    })();`;
    const r = (await page.evaluate(probe)) as {
      title: string | null;
      excerpt: string | null;
      category: string | null;
      authorName: string | null;
      authorInitial: string | null;
      publishedAtRaw: string | null;
      readingMinutes: number | null;
      difficulty: string | null;
      likeCount: number | null;
      coverImage: string | null;
      bodyHtml: string;
    };

    if (!r.title) {
      console.log(`[crawl] skip (no h1) ${url}`);
      continue;
    }
    const slug =
      raw.replace(/.*\/academy\/guide\//, "").replace(/\/+$/, "") || raw;

    articles.push({
      url,
      slug,
      title: r.title,
      excerpt: r.excerpt,
      category: r.category,
      authorName: r.authorName,
      authorInitial: r.authorInitial,
      publishedAtRaw: r.publishedAtRaw,
      readingMinutes: r.readingMinutes,
      difficulty: r.difficulty,
      likeCount: r.likeCount,
      coverImage: r.coverImage,
      bodyMd: td.turndown(r.bodyHtml || ""),
    });
  }

  await writeFile(
    join(OUT, "crawled-articles.json"),
    JSON.stringify(articles, null, 2),
    "utf8",
  );

  console.log(`\n[crawl] saved ${articles.length} articles → crawled-articles.json`);
  const counts: Record<string, number> = {};
  for (const a of articles) {
    const k = a.category || "(unknown)";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// silence unused warning for fs.readdir (kept for future incremental sweeps)
void readdir;

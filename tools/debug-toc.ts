import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "tools", "output");

async function main() {
  const browser = await chromium.launch();

  // ─── 1) Live kiyotaka.ai ────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      colorScheme: "dark",
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(
      "https://kiyotaka.ai/academy/guide/options-greeks-a-simple-introduction-mjwwr6ird8t799",
      { waitUntil: "networkidle" },
    );
    await page.waitForTimeout(1000);

    const info = await page.evaluate(() => {
      const tocCandidates = Array.from(
        document.querySelectorAll('aside, nav, [class*="toc"], [class*="TOC"], [class*="sidebar"]'),
      );
      const tocs = tocCandidates
        .map((el) => ({
          tag: el.tagName,
          cls: (el as HTMLElement).className,
          html: (el as HTMLElement).outerHTML.slice(0, 400),
          links: Array.from(el.querySelectorAll("a")).map((a) => ({
            href: (a as HTMLAnchorElement).getAttribute("href"),
            text: a.textContent?.trim().slice(0, 60),
            ariaCurrent: a.getAttribute("aria-current"),
            cls: (a as HTMLElement).className,
          })).slice(0, 12),
        }))
        .filter((x) => x.links.length > 3);

      const headings = Array.from(document.querySelectorAll("h2, h3")).map((h) => ({
        tag: h.tagName,
        id: h.id,
        text: h.textContent?.trim().slice(0, 80),
      }));

      const scrollers = Array.from(document.querySelectorAll("*")).filter((el) => {
        const cs = getComputedStyle(el);
        return /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 10;
      }).slice(0, 5).map((el) => ({
        tag: el.tagName,
        cls: (el as HTMLElement).className.slice(0, 100),
        sh: el.scrollHeight,
        ch: el.clientHeight,
      }));

      return { tocs, headings: headings.slice(0, 15), scrollers };
    });

    writeFileSync(join(OUT, "kiyo-toc-debug.json"), JSON.stringify(info, null, 2));
    console.log("live kiyotaka tocs:", info.tocs.length);
    console.log("live kiyotaka headings (first 5):", info.headings.slice(0, 5));
    console.log("live kiyotaka scrollers:", info.scrollers);

    // Scroll halfway and capture active state
    await page.evaluate(() => window.scrollTo({ top: 2000, behavior: "instant" as ScrollBehavior }));
    await page.waitForTimeout(500);
    const afterScroll = await page.evaluate(() => {
      const tocCandidates = Array.from(
        document.querySelectorAll('aside, nav, [class*="toc"], [class*="TOC"], [class*="sidebar"]'),
      );
      for (const el of tocCandidates) {
        const links = Array.from(el.querySelectorAll("a"));
        if (links.length < 3) continue;
        return links.map((a) => ({
          text: a.textContent?.trim().slice(0, 50),
          ariaCurrent: a.getAttribute("aria-current"),
          cls: (a as HTMLElement).className,
          dataActive: a.getAttribute("data-active"),
        }));
      }
      return [];
    });
    writeFileSync(join(OUT, "kiyo-toc-after-scroll.json"), JSON.stringify(afterScroll, null, 2));
    console.log("kiyotaka after scroll - first 3 links:", afterScroll.slice(0, 3));

    await ctx.close();
  }

  // ─── 2) Local page ──────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({
      colorScheme: "dark",
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(
      "http://localhost:3000/vi/academy/options-greeks/options-greeks-a-simple-introduction-mjwwr6ird8t799",
      { waitUntil: "networkidle" },
    );
    await page.waitForTimeout(1500);

    const grabTocState = () =>
      page.evaluate(() => {
        // Find the aside that actually contains TOC links (the right one)
        const tocAside = Array.from(document.querySelectorAll("aside"))
          .find((a) => a.querySelectorAll("a[href^='#']").length >= 3);
        const tocLinks = tocAside
          ? Array.from(tocAside.querySelectorAll("a[href^='#']")).map((a) => ({
              href: (a as HTMLAnchorElement).getAttribute("href"),
              text: a.textContent?.trim().slice(0, 50),
              ariaCurrent: a.getAttribute("aria-current"),
              cls: (a as HTMLElement).className,
            }))
          : [];
        return tocLinks;
      });

    const info = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h2, h3")).map((h) => ({
        tag: h.tagName,
        id: h.id,
        text: h.textContent?.trim().slice(0, 80),
      }));
      return { headings: headings.slice(0, 5) };
    });
    const tocLinksInitial = await grabTocState();
    console.log("\nlocal tocLinks:", tocLinksInitial.length);
    console.log("local headings:", info.headings);
    console.log("local link href vs heading id (first 3):");
    for (let i = 0; i < 3; i++) {
      console.log(`  link=${tocLinksInitial[i]?.href}  heading=#${info.headings[i]?.id}`);
    }
    console.log("\ninitial TOC active state:");
    for (const l of tocLinksInitial.slice(0, 4)) {
      console.log(`  ${l.text} → aria-current=${l.ariaCurrent}`);
    }

    // Scroll down to trigger spy update
    await page.evaluate(() => window.scrollTo({ top: 2500, behavior: "instant" as ScrollBehavior }));
    await page.waitForTimeout(400);
    const tocAfterScroll = await grabTocState();
    console.log("\nafter scroll(2500) TOC active state:");
    for (const l of tocAfterScroll.slice(0, 6)) {
      console.log(`  ${l.text} → aria-current=${l.ariaCurrent}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

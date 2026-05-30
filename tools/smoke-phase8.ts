/**
 * Phase 8 SEO/GEO max-out smoke test. Assumes a server on :3000.
 *
 * Covers the Phase-8 deltas:
 *  - robots: /api/articles allowed, AI-bot tokens refreshed, /login un-blocked
 *  - sitemap: glossary entry + x-default hreflang
 *  - article HTML: unified @graph w/ Person author + real dateModified +
 *    wordCount + timeRequired + DefinedTerm mentions; markdown <link>;
 *    max-image-preview directive; NO FAQPage
 *  - markdown mirror + llms.txt: X-Robots-Tag noindex; enriched frontmatter
 *  - login: noindex meta
 *  - author profile page: ProfilePage + Person (#person-<slug>) reused as the
 *    article author @id
 *  - landing: CollectionPage + ItemList
 *  - OG images render
 */

export {}; // module scope — avoids global redeclare clash with other smoke scripts

const BASE = "http://localhost:3000";
const ART = "/en/academy/order-flow-footprints/delta-explained";
const MIRROR = "/api/articles/en/order-flow-footprints/delta-explained";
const AUTHOR = "/en/authors/markets-desk";

let failed = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) failed++;
}

async function fetchRes(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, body: await res.text(), headers: res.headers };
}

async function main() {
  // 1 — robots
  {
    const { body } = await fetchRes("/robots.txt");
    check("robots allows /api/articles", /Allow:\s*\/api\/articles/i.test(body));
    check(
      "robots lists Claude-SearchBot",
      /User-Agent:\s*Claude-SearchBot/i.test(body),
    );
    check(
      "robots dropped deprecated anthropic-ai",
      !/anthropic-ai/i.test(body),
    );
    check("robots disallows /admin", /Disallow:.*\/admin/i.test(body));
    check(
      "robots no longer blocks /login (noindex instead)",
      !/Disallow:\s*\/login\b/i.test(body),
    );
  }

  // 2 — sitemap
  {
    const { body } = await fetchRes("/sitemap.xml");
    check("sitemap includes glossary", body.includes("/academy/glossary"));
    check("sitemap has x-default hreflang", /hreflang="x-default"/.test(body));
  }

  // 3 — article HTML / JSON-LD
  {
    const { status, body } = await fetchRes(ART);
    check("article 200", status === 200, String(status));
    check("article emits @graph", body.includes('"@graph"'));
    check("article author is a Person", body.includes('"@type":"Person"'));
    check(
      "article author @id is locale-stable #person-markets-desk",
      body.includes("#person-markets-desk"),
    );
    check("article has wordCount", body.includes('"wordCount"'));
    check("article has timeRequired PTnM", /"timeRequired":"PT\d+M"/.test(body));
    check("article has dateModified", body.includes('"dateModified"'));
    check(
      "article co-typed Article+LearningResource",
      body.includes('"LearningResource"'),
    );
    check(
      "article links the Markdown mirror in <head>",
      /type="text\/markdown"/.test(body),
    );
    check("article has NO FAQPage", !body.includes("FAQPage"));
    check(
      "article carries max-image-preview directive",
      body.includes("max-image-preview:large"),
    );
    check(
      "article mentions a glossary DefinedTerm",
      body.includes('"DefinedTerm"'),
    );
  }

  // 4 — markdown mirror
  {
    const { status, body, headers } = await fetchRes(MIRROR);
    check("mirror 200", status === 200, String(status));
    check(
      "mirror X-Robots-Tag noindex",
      (headers.get("x-robots-tag") ?? "").includes("noindex"),
    );
    check("mirror frontmatter has author", /\nauthor:/.test(body));
    check("mirror frontmatter has reading_time", /\nreading_time:/.test(body));
  }

  // 5 — llms.txt header
  {
    const { headers } = await fetchRes("/llms.txt");
    check(
      "llms.txt X-Robots-Tag noindex",
      (headers.get("x-robots-tag") ?? "").includes("noindex"),
    );
  }

  // 6 — login noindex
  {
    const { body } = await fetchRes("/en/login");
    check(
      "login is noindex",
      /name="robots"[^>]*noindex/i.test(body),
    );
  }

  // 7 — author profile page
  {
    const { status, body } = await fetchRes(AUTHOR);
    check("author page 200", status === 200, String(status));
    check("author page emits ProfilePage", body.includes('"ProfilePage"'));
    check(
      "author page Person reuses #person-markets-desk",
      body.includes("#person-markets-desk"),
    );
    check(
      "author page shows jobTitle",
      body.includes("Senior Markets Analyst"),
    );
  }

  // 8 — landing CollectionPage
  {
    const { body } = await fetchRes("/en/academy");
    check("landing emits CollectionPage", body.includes('"CollectionPage"'));
    check("landing emits ItemList", body.includes('"ItemList"'));
  }

  // 9 — OG images
  {
    const site = await fetch(`${BASE}/opengraph-image`);
    check(
      "site OG image",
      site.ok && (site.headers.get("content-type") ?? "").startsWith("image/"),
    );
    const artOg = await fetch(`${BASE}${ART}/opengraph-image`);
    check(
      "article OG image",
      artOg.ok &&
        (artOg.headers.get("content-type") ?? "").startsWith("image/"),
    );
  }

  console.log(failed === 0 ? "\nPhase 8 smoke: ALL PASS" : `\nPhase 8 smoke: ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main();

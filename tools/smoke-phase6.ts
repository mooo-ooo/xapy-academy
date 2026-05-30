/**
 * Phase 6 SEO + GEO smoke test.
 *
 * 1. /sitemap.xml has every article × locale URL + xhtml:link alternates.
 * 2. /robots.txt allows GPTBot/ClaudeBot/PerplexityBot, disallows /admin.
 * 3. /llms.txt is valid Markdown listing modules + articles.
 * 4. /en/academy/order-flow-footprints/delta-explained.md returns Markdown
 *    with YAML frontmatter.
 * 5. Article HTML contains Article + BreadcrumbList JSON-LD <script> tags.
 * 6. /opengraph-image returns 200 image.
 * 7. /en/academy/.../delta-explained/opengraph-image returns 200 image.
 */

export {}; // module scope — avoids global redeclare clash with other smoke scripts

const BASE = "http://localhost:3000";

let failed = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}`);
  if (!ok) failed++;
}

async function fetchText(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, body: await res.text(), headers: res.headers };
}

async function main() {
  // 1 — sitemap
  {
    const { status, body } = await fetchText("/sitemap.xml");
    check("sitemap status 200", status === 200, String(status));
    check(
      "sitemap contains article URL",
      body.includes("/academy/order-flow-footprints/delta-explained"),
    );
    check(
      "sitemap contains VI article URL",
      body.includes("/vi/academy/order-flow-footprints/delta-la-gi"),
    );
    check("sitemap has hreflang alternates", body.includes("xhtml:link"));
  }

  // 2 — robots
  {
    const { status, body } = await fetchText("/robots.txt");
    check("robots status 200", status === 200, String(status));
    check("robots allows GPTBot", /User-Agent:\s*GPTBot/i.test(body));
    check("robots allows ClaudeBot", /User-Agent:\s*ClaudeBot/i.test(body));
    check(
      "robots allows PerplexityBot",
      /User-Agent:\s*PerplexityBot/i.test(body),
    );
    check("robots disallows /admin", /Disallow:.*\/admin/i.test(body));
    check("robots references sitemap", /Sitemap:.*sitemap\.xml/i.test(body));
  }

  // 3 — llms.txt
  {
    const { status, body, headers } = await fetchText("/llms.txt");
    check("llms.txt status 200", status === 200, String(status));
    check(
      "llms.txt content-type markdown",
      (headers.get("content-type") ?? "").startsWith("text/markdown"),
    );
    check(
      "llms.txt has title heading",
      /^# Kiyotaka Academy/m.test(body),
    );
    check(
      "llms.txt links to Markdown article mirror",
      body.includes("/api/articles/"),
    );
  }

  // 4 — Markdown API mirror (used by llms.txt for LLM crawlers)
  {
    const { status, body, headers } = await fetchText(
      "/api/articles/en/order-flow-footprints/delta-explained",
    );
    check("md mirror status 200", status === 200, String(status));
    check(
      "md mirror content-type markdown",
      (headers.get("content-type") ?? "").startsWith("text/markdown"),
    );
    check("md mirror has frontmatter", body.startsWith("---"));
    check(
      "md mirror has title",
      /^title:\s+"?Delta explained/m.test(body),
    );
    check("md mirror has body H1", body.includes("# Delta explained"));
  }

  // 5 — article HTML JSON-LD
  {
    const { status, body } = await fetchText(
      "/en/academy/order-flow-footprints/delta-explained",
    );
    check("article HTML status 200", status === 200, String(status));
    check(
      "article HTML has Article JSON-LD",
      // Phase 8 co-types Article+LearningResource inside one @graph, so the
      // @type is now an array — accept both scalar and array forms.
      /<script type="application\/ld\+json">[\s\S]*?"@type":(?:"Article"|\["Article")/.test(
        body,
      ),
    );
    check(
      "article HTML has BreadcrumbList JSON-LD",
      /<script type="application\/ld\+json">[\s\S]*?"@type":"BreadcrumbList"/.test(
        body,
      ),
    );
    check(
      "article HTML has hreflang alternate link",
      /<link[^>]+rel="alternate"[^>]+hrefLang/i.test(body),
    );
  }

  // 6 — site OG
  {
    const res = await fetch(`${BASE}/opengraph-image`);
    check("site OG status 200", res.status === 200, String(res.status));
    check(
      "site OG content-type image",
      (res.headers.get("content-type") ?? "").startsWith("image/"),
    );
  }

  // 7 — article OG
  {
    const res = await fetch(
      `${BASE}/en/academy/order-flow-footprints/delta-explained/opengraph-image`,
    );
    check("article OG status 200", res.status === 200, String(res.status));
    check(
      "article OG content-type image",
      (res.headers.get("content-type") ?? "").startsWith("image/"),
    );
  }

  console.log(
    failed === 0 ? "\n[smoke] ALL PASS" : `\n[smoke] ${failed} FAILED`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";

/**
 * robots.txt — explicitly welcomes AI crawlers (GEO playbook) and blocks
 * the admin / private-API surface.
 *
 * Two deliberate choices:
 *  - `/api` is disallowed wholesale EXCEPT `/api/articles`, the Markdown
 *    mirror that `llms.txt` advertises for LLM ingestion. Google/Bing honour
 *    longest-match precedence, so the more-specific Allow wins for the mirror
 *    while the rest of `/api` (auth, mutations, feed) stays blocked.
 *  - Auth/account pages are NOT disallowed here. They carry a `noindex` meta
 *    instead (login/register/account `generateMetadata`); a crawler must be
 *    allowed to fetch the page to SEE that directive, so blocking + noindex
 *    would be self-defeating.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin().replace(/\/$/, "");
  const disallow = ["/admin", "/api", "/_next", "/tools/output"];
  // The Markdown mirror lives under /api/articles — keep it crawlable so the
  // URLs llms.txt links to are actually fetchable by retrieval bots.
  const allow = ["/", "/api/articles"];

  // Current (2026) AI crawler / retrieval UA tokens we welcome. Deprecated
  // Anthropic tokens (`anthropic-ai`, `Claude-Web`) dropped; the live
  // `Claude-SearchBot` (citation index) + `Claude-User` (user fetch) added,
  // plus `OAI-SearchBot` and `Meta-ExternalFetcher`. Each mirrors the `*`
  // policy — explicit entries are a welcome signal, not a different rule.
  const aiBots = [
    // OpenAI
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    // Anthropic
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    // Perplexity
    "PerplexityBot",
    "Perplexity-User",
    // Google (Gemini training opt-in token; not a crawler per se)
    "Google-Extended",
    // Apple
    "Applebot-Extended",
    // Meta
    "Meta-ExternalAgent",
    "Meta-ExternalFetcher",
    // Misc retrieval / training crawlers
    "Amazonbot",
    "Bytespider",
    "DuckAssistBot",
    "MistralAI-User",
    "CCBot",
  ];

  return {
    rules: [
      { userAgent: "*", allow, disallow },
      ...aiBots.map((bot) => ({ userAgent: bot, allow, disallow })),
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

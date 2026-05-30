import { Link } from "@/i18n/navigation";
import { ArrowRight, Clock, Heart } from "lucide-react";
import type { ArticleListItem } from "@/lib/data/articles";
import { TruncatedText } from "@/components/academy/truncated-text";

/**
 * Guide / article card — mirrors the kiyotaka.ai DOM structure that
 * extract-cards.ts captured:
 *
 *   <a class="academy-guide-card">
 *     <div class="academy-guide-image">…cover…</div>
 *     <div class="academy-guide-content">           p=24, flex col
 *       <div class="academy-guide-meta">           clock+min • diff | heart count
 *       <h3 class="academy-guide-title">           20 / 700 / lh 26 / tracking 1.12
 *       <p  class="academy-guide-excerpt">          14 / 400 / lh 21 / tracking 0.6
 *       <div class="academy-guide-footer">          avatar+name | Read Guide →
 *
 * Cover image uses a deterministic gradient when no image is uploaded
 * (matches the look of the target's procedural artwork without needing
 * to host real assets in dev).
 */
export function ArticleCard({
  moduleSlug,
  article,
}: {
  moduleSlug: string;
  article: ArticleListItem;
}) {
  const initial = (article.author.name || article.author.email).charAt(0).toUpperCase();
  const authorName = article.author.name || article.author.email.split("@")[0];
  const difficulty = article.difficulty.toLowerCase();
  const coverGradient = gradientFor(article.moduleSlug);

  return (
    <Link
      href={`/academy/${moduleSlug}/${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--card-hover))]"
    >
      {/* Cover — a real <img> (alt + lazy) when uploaded so it's crawlable
          for Image/Discover; deterministic gradient otherwise. The 16/10
          aspect box reserves space either way (no CLS). */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden"
        style={article.coverImage ? undefined : { backgroundImage: coverGradient }}
      >
        {article.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImage}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span
          className="absolute left-3 top-3 inline-flex items-center rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-white backdrop-blur"
        >
          {article.moduleName}
        </span>
        {article.isFallback && (
          <span
            className="absolute right-3 top-3 inline-flex items-center rounded-md border border-[hsl(var(--border-strong))] bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-[hsl(var(--muted-foreground))] backdrop-blur"
            title="Translation not available yet — showing English"
          >
            {article.locale.toUpperCase()}
          </span>
        )}
      </div>

      {/* Content — padding 24, flex col */}
      <div className="flex flex-1 flex-col p-6">
        {/* Meta row */}
        <div
          className="mb-3 flex items-center justify-between text-[hsl(var(--foreground))]"
          style={{
            fontSize: 14,
            fontWeight: 400,
            lineHeight: "21px",
            letterSpacing: "0.6px",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} strokeWidth={2} />
              {article.readingTimeMinutes} min
            </span>
            <span className="text-[hsl(var(--muted-foreground))]">•</span>
            <span className="capitalize text-[hsl(var(--foreground))]">
              {difficulty}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
            <Heart size={14} strokeWidth={2} />
            {article.likeCount}
          </div>
        </div>

        {/* Title — 20 / 700 / lh 26 / tracking 1.12 / clamp 2 lines.
            Reserve full 52px (2 × 26px) so every card has the same
            title block height regardless of length. */}
        <TruncatedText
          as="h3"
          text={article.title}
          lines={2}
          className="mb-2 text-[hsl(var(--foreground))]"
          style={{
            fontSize: 20,
            fontWeight: 700,
            lineHeight: "26px",
            letterSpacing: "1.12px",
            minHeight: 52,
          }}
        />

        {/* Excerpt — 14 / 400 / lh 21 / tracking 0.6, muted, clamp 3.
            Always reserves 63px (3 × 21px) so cards stay equal even
            when excerpt is null. */}
        <div className="mb-6" style={{ minHeight: 63 }}>
          {article.excerpt && (
            <TruncatedText
              as="p"
              text={article.excerpt}
              lines={3}
              className="text-[hsl(var(--muted-foreground))]"
              style={{
                fontSize: 14,
                fontWeight: 400,
                lineHeight: "21px",
                letterSpacing: "0.6px",
              }}
            />
          )}
        </div>

        {/* Footer pushed to bottom */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
              style={{
                backgroundImage:
                  "linear-gradient(to right bottom, rgb(59, 130, 246), rgb(139, 92, 246))",
                lineHeight: "15px",
                letterSpacing: "0.6px",
              }}
            >
              {initial}
            </div>
            <span className="text-sm text-[hsl(var(--foreground))]">
              {authorName}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--accent-emerald))]">
            Read Guide
            <ArrowRight size={12} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Deterministic cover gradient per module slug — gives every card a
 * distinguishable cover even before an admin uploads real artwork.
 */
function gradientFor(slug: string): string {
  const palettes: Record<string, string> = {
    "order-flow-footprints":
      "linear-gradient(135deg, #1a0e0e 0%, #3a1208 40%, #ff6a00 100%)",
    "tpo-profile":
      "linear-gradient(135deg, #0e1a1a 0%, #0b3a3a 40%, #10b981 100%)",
    "technical-analysis":
      "linear-gradient(135deg, #0e0e1a 0%, #1a1a3a 40%, #6366f1 100%)",
    psychology:
      "linear-gradient(135deg, #1a0e1a 0%, #3a1a3a 40%, #d946ef 100%)",
  };
  return (
    palettes[slug] ??
    "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 40%, #404040 100%)"
  );
}

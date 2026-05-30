import { Link } from "@/i18n/navigation";
import type { SearchHit } from "@/lib/data/search";

export function SearchResultCard({
  hit,
  query,
}: {
  hit: SearchHit;
  query: string;
}) {
  return (
    <Link
      href={`/academy/${hit.moduleSlug}/${hit.slug}`}
      className="block rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--card-hover))]"
    >
      <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
        {hit.moduleName}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">
        <Highlight text={hit.title} query={query} />
      </h3>
      {hit.matchedSnippet && (
        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          <Highlight text={hit.matchedSnippet} query={query} />
        </p>
      )}
    </Link>
  );
}

/** Wrap case-insensitive matches in <mark>. Splits on whitespace. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return <>{text}</>;

  // Build a single regex with all terms, longest first to avoid partial
  // shadowing. Escape regex metacharacters in each term.
  const pattern = terms
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp(`(${pattern})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark
            key={i}
            className="rounded-sm bg-emerald-500/30 px-0.5 text-emerald-100"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

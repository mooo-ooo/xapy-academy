import { Link } from "@/i18n/navigation";

/**
 * Author byline below the H1 — circular gradient avatar (initial) +
 * name + ISO date row. Mirrors kiyotaka's `.guide-author` block.
 *
 * When `authorSlug` is set the name links to the public author profile —
 * the HTML mirror of the Article JSON-LD `author.url`, reinforcing the
 * Person entity for E-E-A-T / AI citation.
 */
export function AuthorBar({
  name,
  publishedAt,
  locale,
  authorSlug,
}: {
  name: string;
  publishedAt: Date | null;
  locale: string;
  authorSlug?: string | null;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const dateLabel = publishedAt
    ? publishedAt.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  return (
    <div className="mt-8 flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold uppercase text-white"
        style={{
          backgroundImage:
            "linear-gradient(to right bottom, rgb(59, 130, 246), rgb(139, 92, 246))",
        }}
        aria-hidden="true"
      >
        {initial}
      </div>
      <div className="leading-tight">
        {authorSlug ? (
          <Link
            href={`/authors/${authorSlug}`}
            className="text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--accent-emerald))]"
          >
            {name}
          </Link>
        ) : (
          <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {name}
          </div>
        )}
        {dateLabel && (
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            {dateLabel}
          </div>
        )}
      </div>
    </div>
  );
}

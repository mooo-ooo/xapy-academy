/**
 * Loading placeholder mirroring ArticleCard's layout — cover, category
 * badge, meta row, title, excerpt, and author footer — so the grid
 * doesn't reflow when real cards stream in. Matches kiyotaka.ai's
 * `academy-guide-card-skeleton` shimmer.
 */
export function ArticleCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      {/* Cover */}
      <div className="relative aspect-[16/10] w-full skeleton-shimmer">
        <span className="absolute left-3 top-3 h-5 w-24 rounded-md skeleton-block" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Meta row */}
        <div className="mb-3 flex items-center justify-between">
          <span className="h-3.5 w-28 rounded skeleton-block" />
          <span className="h-3.5 w-10 rounded skeleton-block" />
        </div>

        {/* Title — two lines (52px, matches ArticleCard min-height) */}
        <div className="mb-2 flex flex-col gap-1.5" style={{ minHeight: 52 }}>
          <span className="h-5 w-full rounded skeleton-shimmer" />
          <span className="h-5 w-2/3 rounded skeleton-shimmer" />
        </div>

        {/* Excerpt — three lines (63px) */}
        <div className="mb-6 flex flex-col gap-1.5" style={{ minHeight: 63 }}>
          <span className="h-3.5 w-full rounded skeleton-block" />
          <span className="h-3.5 w-full rounded skeleton-block" />
          <span className="h-3.5 w-1/2 rounded skeleton-block" />
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full skeleton-shimmer" />
            <span className="h-3.5 w-20 rounded skeleton-block" />
          </div>
          <span className="h-3.5 w-20 rounded skeleton-block" />
        </div>
      </div>
    </div>
  );
}

/** A responsive grid of N card skeletons — matches the academy grids
 *  (gap-6, 1/2/3/4 cols across breakpoints). */
export function ArticleCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

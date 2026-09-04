/**
 * Article detail loading skeleton — mirrors the 3-column reading layout
 * (rail · body · TOC) so the page doesn't jump when content streams in.
 */
export default function ArticleLoading() {
  return (
    <article>
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-16 sm:pt-24 lg:pt-32">
        {/* Back link */}
        <span className="mb-6 block h-4 w-24 rounded skeleton-block" />

        <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-[88px_minmax(0,1fr)_256px] lg:items-start lg:gap-x-12 lg:gap-y-12">
          {/* Header */}
          <header className="w-full max-w-3xl lg:col-start-2 lg:row-start-1">
            <span className="block h-6 w-32 rounded-full skeleton-block" />
            <div className="mt-6 flex flex-col gap-3">
              <span className="h-11 w-full rounded skeleton-shimmer" />
              <span className="h-11 w-3/4 rounded skeleton-shimmer" />
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <span className="h-5 w-full rounded skeleton-block" />
              <span className="h-5 w-2/3 rounded skeleton-block" />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-9 w-9 rounded-full skeleton-shimmer" />
              <div className="flex flex-col gap-1.5">
                <span className="h-3.5 w-28 rounded skeleton-block" />
                <span className="h-3 w-20 rounded skeleton-block" />
              </div>
            </div>
          </header>

          {/* Left rail */}
          <aside className="hidden flex-col items-center gap-4 lg:flex lg:col-start-1 lg:row-start-2">
            <span className="h-10 w-10 rounded-full skeleton-shimmer" />
            <span className="h-10 w-10 rounded-full skeleton-shimmer" />
          </aside>

          {/* Body */}
          <div className="w-full max-w-3xl lg:col-start-2 lg:row-start-2">
            <div className="flex flex-col gap-4">
              <span className="h-7 w-1/2 rounded skeleton-shimmer" />
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={`a${i}`} className="h-4 w-full rounded skeleton-block" />
              ))}
              <span className="h-4 w-2/3 rounded skeleton-block" />
              <span className="mt-4 h-7 w-2/5 rounded skeleton-shimmer" />
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={`b${i}`} className="h-4 w-full rounded skeleton-block" />
              ))}
              <span className="h-4 w-1/2 rounded skeleton-block" />
            </div>
          </div>

          {/* TOC */}
          <div className="hidden lg:col-start-3 lg:row-start-2 lg:block">
            <span className="mb-4 block h-3 w-20 rounded skeleton-block" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3.5 rounded skeleton-block"
                  style={{ width: `${90 - i * 8}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

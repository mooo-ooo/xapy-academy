import { Link } from "@/i18n/navigation";

export function ModuleArticleNav({
  moduleName,
  moduleSlug,
  items,
  currentSlug,
}: {
  moduleName: string;
  moduleSlug: string;
  items: { slug: string; title: string }[];
  currentSlug: string;
}) {
  return (
    <nav aria-label={moduleName} className="text-sm">
      <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
        {moduleName}
      </p>
      <ol className="flex flex-col gap-0.5">
        {items.map((it) => {
          const active = it.slug === currentSlug;
          return (
            <li key={it.slug}>
              <Link
                href={`/academy/${moduleSlug}/${it.slug}`}
                aria-current={active ? "page" : undefined}
                title={it.title}
                className={
                  active
                    ? "block truncate border-l-2 border-[color:var(--article-accent,hsl(var(--accent-emerald)))] bg-[hsl(var(--hover))] py-1.5 pl-3 pr-2 font-medium text-[hsl(var(--foreground))]"
                    : "block truncate border-l-2 border-transparent py-1.5 pl-3 pr-2 text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--foreground))]"
                }
              >
                {it.title}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { Link } from "@/i18n/navigation";

/**
 * Rounded pill above the article H1 — uppercase category label like
 * "ORDER FLOW" from the kiyotaka detail page.
 */
export function CategoryPill({
  moduleSlug,
  moduleName,
}: {
  moduleSlug: string;
  moduleName: string;
}) {
  return (
    <Link
      href={`/academy/${moduleSlug}`}
      className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[1.2px] text-blue-300 transition-colors hover:border-blue-400/50 hover:bg-blue-500/20"
    >
      {moduleName}
    </Link>
  );
}

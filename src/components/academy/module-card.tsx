import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import type { ModuleCard as ModuleCardData } from "@/lib/data/modules";

export function ModuleCard({
  module,
  countLabel,
}: {
  module: ModuleCardData;
  countLabel: (n: number) => string;
}) {
  return (
    <Link
      href={`/academy/${module.slug}`}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--card-hover))]"
    >
      <div className="absolute right-5 top-5 text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--foreground))]">
        <ArrowUpRight size={18} />
      </div>
      <span className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
        {countLabel(module.articleCount)}
      </span>
      <h3 className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
        {module.name}
      </h3>
      {module.description && (
        <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {module.description}
        </p>
      )}
    </Link>
  );
}

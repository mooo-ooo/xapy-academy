import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.6px]",
  {
    variants: {
      tone: {
        neutral: "border-[hsl(var(--border))] bg-[hsl(var(--hover))] text-[hsl(var(--muted-foreground))]",
        admin: "border-purple-400/30 bg-purple-500/10 text-purple-300",
        ctv: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
        user: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
        draft: "border-[hsl(var(--border))] bg-[hsl(var(--hover))] text-[hsl(var(--muted-foreground))]",
        review: "border-amber-400/30 bg-amber-500/10 text-amber-300",
        published:
          "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
        archived: "border-[hsl(var(--border))] bg-[hsl(var(--hover))] text-zinc-500",
        pending: "border-[hsl(var(--border))] bg-[hsl(var(--hover))] text-[hsl(var(--muted-foreground))]",
        in_progress: "border-blue-400/30 bg-blue-500/10 text-blue-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

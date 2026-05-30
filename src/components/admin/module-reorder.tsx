"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { reorderModuleAction } from "@/app/[locale]/admin/modules/actions";

export function ModuleReorder({
  id,
  idx,
  total,
}: {
  id: string;
  idx: number;
  total: number;
}) {
  const t = useTranslations("admin.modules.reorder");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const res = await reorderModuleAction({ id, direction });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  const btn =
    "rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[hsl(var(--muted-foreground))]";

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        disabled={pending || idx === 0}
        onClick={() => move("up")}
        aria-label={t("up")}
        className={btn}
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ChevronUp size={14} />
        )}
      </button>
      <button
        type="button"
        disabled={pending || idx >= total - 1}
        onClick={() => move("down")}
        aria-label={t("down")}
        className={btn}
      >
        <ChevronDown size={14} />
      </button>
    </span>
  );
}

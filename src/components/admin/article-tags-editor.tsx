"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setArticleTagsAction } from "@/app/[locale]/admin/tags/actions";

export function ArticleTagsEditor({
  articleId,
  options,
  initial,
}: {
  articleId: string;
  options: { id: string; label: string }[];
  initial: string[];
}) {
  const t = useTranslations("admin.tags.articleTags");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function save() {
    startTransition(async () => {
      const res = await setArticleTagsAction({
        articleId,
        tagIds: [...selected],
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {t("noneAvailable")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                on
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))]",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div>
        <Button type="button" onClick={save} disabled={pending} size="sm">
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

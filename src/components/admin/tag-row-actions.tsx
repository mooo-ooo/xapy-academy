"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  deleteTagAction,
  toggleTrendingAction,
} from "@/app/[locale]/admin/tags/actions";

export function TrendingToggle({
  id,
  isTrending,
}: {
  id: string;
  isTrending: boolean;
}) {
  const t = useTranslations("admin.tags");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState(isTrending);

  function toggle() {
    startTransition(async () => {
      const res = await toggleTrendingAction({ id, isTrending: !on });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOn(!on);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:opacity-60",
        on
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover))]",
      )}
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Sparkles size={12} />
      )}
      {on ? t("trendingOn") : t("trendingOff")}
    </button>
  );
}

export function TagDeleteButton({ id }: { id: string }) {
  const t = useTranslations("admin.tags.delete");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onDelete() {
    startTransition(async () => {
      const res = await deleteTagAction({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("deleted"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-300 hover:text-red-200"
        >
          <Trash2 size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("dialogDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={onDelete}
              disabled={pending}
              className="bg-red-500/90 hover:bg-red-500"
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              {t("confirm")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

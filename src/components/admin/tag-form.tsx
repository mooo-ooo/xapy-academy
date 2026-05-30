"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { createTagAction } from "@/app/[locale]/admin/tags/actions";

export function TagForm() {
  const router = useRouter();
  const t = useTranslations("admin.tags.form");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createTagAction({ slug: String(fd.get("slug") ?? "") });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("createdToast"));
      if (res.id) router.push(`/admin/tags/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug" required>
          {t("slugLabel")}
        </Label>
        <Input id="slug" name="slug" required placeholder={t("slugPlaceholder")} />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {t("slugHint")}
        </p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("saveCreate")}
        </Button>
      </div>
    </form>
  );
}

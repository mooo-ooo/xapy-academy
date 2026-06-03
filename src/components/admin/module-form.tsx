"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { IconPicker } from "@/components/admin/icon-picker";
import { upsertModuleAction } from "@/app/[locale]/admin/modules/actions";

export function ModuleForm({
  initial,
}: {
  initial?: {
    id: string;
    slug: string;
    icon: string;
    sortOrder: number;
    isPublic: boolean;
  };
}) {
  const router = useRouter();
  const t = useTranslations("admin.modules.form");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertModuleAction({
        id: initial?.id,
        slug: String(fd.get("slug") ?? ""),
        icon: String(fd.get("icon") ?? ""),
        isPublic: fd.get("isPublic") === "on",
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(initial ? t("updatedToast") : t("createdToast"));
      if (!initial && res.id) {
        router.push(`/admin/modules/${res.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex max-w-xl flex-col gap-1.5">
        <Label htmlFor="slug" required>
          {t("slugLabel")}
        </Label>
        <Input
          id="slug"
          name="slug"
          required
          defaultValue={initial?.slug ?? ""}
          placeholder={t("slugPlaceholder")}
        />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {t("slugHint")}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("iconLabel")}</Label>
        <IconPicker name="icon" initial={initial?.icon ?? ""} />
      </div>
      <label className="flex max-w-xl items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--inset))] p-3">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={initial?.isPublic ?? true}
          className="h-4 w-4 accent-emerald-500"
        />
        <div>
          <div className="text-sm text-[hsl(var(--foreground))]">
            {t("publicLabel")}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            {t("publicHint")}
          </div>
        </div>
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          {initial ? t("saveUpdate") : t("saveCreate")}
        </Button>
      </div>
    </form>
  );
}

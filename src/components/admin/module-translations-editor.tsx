"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { upsertModuleTranslationAction } from "@/app/[locale]/admin/modules/actions";

type Translation =
  | {
      name: string;
      description: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
    }
  | undefined;

export function ModuleTranslationsEditor({
  moduleId,
  locales,
  initialByLocale,
}: {
  moduleId: string;
  locales: string[];
  initialByLocale: Record<string, Translation>;
}) {
  const [active, setActive] = useState(locales[0]);
  // EN translation acts as the placeholder/hint for empty tabs so admins
  // see the source text they're translating from instead of a blank form.
  const fallback = initialByLocale.en;

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList>
        {locales.map((l) => (
          <TabsTrigger key={l} value={l}>
            {l.toUpperCase()}
          </TabsTrigger>
        ))}
      </TabsList>
      {locales.map((l) => (
        <TabsContent key={l} value={l}>
          <TranslationForm
            moduleId={moduleId}
            locale={l}
            initial={initialByLocale[l]}
            fallback={l === "en" ? undefined : fallback}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TranslationForm({
  moduleId,
  locale,
  initial,
  fallback,
}: {
  moduleId: string;
  locale: string;
  initial: Translation;
  fallback: Translation;
}) {
  const t = useTranslations("admin.modules.translationsForm");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertModuleTranslationAction({
        moduleId,
        locale,
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? ""),
        metaTitle: String(fd.get("metaTitle") ?? ""),
        metaDescription: String(fd.get("metaDescription") ?? ""),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("savedToast", { locale: locale.toUpperCase() }));
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`name-${locale}`} required>
          {t("nameLabel")}
        </Label>
        <Input
          id={`name-${locale}`}
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          placeholder={fallback?.name ?? t("namePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`description-${locale}`}>
          {t("descriptionLabel")}
        </Label>
        <Textarea
          id={`description-${locale}`}
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder={
            fallback?.description ?? t("descriptionPlaceholder")
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`metaTitle-${locale}`}>{t("metaTitleLabel")}</Label>
          <Input
            id={`metaTitle-${locale}`}
            name="metaTitle"
            maxLength={160}
            defaultValue={initial?.metaTitle ?? ""}
            placeholder={fallback?.metaTitle ?? t("metaTitlePlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`metaDescription-${locale}`}>
            {t("metaDescriptionLabel")}
          </Label>
          <Input
            id={`metaDescription-${locale}`}
            name="metaDescription"
            maxLength={280}
            defaultValue={initial?.metaDescription ?? ""}
            placeholder={
              fallback?.metaDescription ?? t("metaDescriptionPlaceholder")
            }
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("saveButton", { locale: locale.toUpperCase() })}
        </Button>
      </div>
    </form>
  );
}

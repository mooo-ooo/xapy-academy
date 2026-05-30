"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { upsertTagTranslationAction } from "@/app/[locale]/admin/tags/actions";

export function TagTranslationsEditor({
  tagId,
  locales,
  initialByLocale,
}: {
  tagId: string;
  locales: string[];
  initialByLocale: Record<string, string | undefined>;
}) {
  const [active, setActive] = useState(locales[0]);
  // EN name acts as placeholder for empty tabs so the admin sees the
  // source they're translating from.
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
          <TForm
            tagId={tagId}
            locale={l}
            initial={initialByLocale[l]}
            fallback={l === "en" ? undefined : fallback}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TForm({
  tagId,
  locale,
  initial,
  fallback,
}: {
  tagId: string;
  locale: string;
  initial: string | undefined;
  fallback: string | undefined;
}) {
  const t = useTranslations("admin.tags.translationsForm");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertTagTranslationAction({
        tagId,
        locale,
        name: String(fd.get("name") ?? ""),
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
          defaultValue={initial ?? ""}
          placeholder={fallback ?? t("namePlaceholder")}
        />
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

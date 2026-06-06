"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import { AccentColorField } from "@/components/admin/accent-color-field";
import { routing } from "@/i18n/routing";
import { createArticleAction } from "../actions";
import { slugify } from "@/lib/utils";

export function NewArticleForm({
  modules,
  locales,
}: {
  modules: Array<{ id: string; slug: string; name: string }>;
  locales: string[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.articles");
  const [pending, startTransition] = useTransition();
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [sourceLocale, setSourceLocale] = useState<string>(
    routing.defaultLocale,
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [difficulty, setDifficulty] = useState<
    "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  >("BEGINNER");
  const [body, setBody] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [activeTab, setActiveTab] = useState("content");

  function onTitleChange(next: string) {
    setTitle(next);
    if (!slugDirty) setSlug(slugify(next));
  }
  function onSlugChange(next: string) {
    setSlug(next);
    setSlugDirty(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createArticleAction({
        moduleId,
        sourceLocale,
        slug,
        title,
        excerpt: String(fd.get("excerpt") ?? ""),
        bodyHtml: body,
        metaTitle: String(fd.get("metaTitle") ?? ""),
        metaDescription: String(fd.get("metaDescription") ?? ""),
        difficulty,
        coverImage: String(fd.get("coverImage") ?? ""),
        accentColor,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("new.created"));
      router.push(`/admin/articles/${res.id}/edit`);
    });
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col gap-6"
    >
      <div className="sticky top-[72px] z-30 flex flex-wrap items-center justify-between gap-3 border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 shadow-md">
        <TabsList className="flex h-auto flex-row flex-wrap items-center gap-1 rounded-none border-0 bg-transparent p-0 shadow-none">
          <TabsTrigger
            value="content"
            title={t("editTabs.content")}
            className="truncate rounded-lg px-4 py-2"
          >
            {t("editTabs.content")}
          </TabsTrigger>
          <TabsTrigger
            value="seo"
            title={t("editTabs.seo")}
            className="truncate rounded-lg px-4 py-2"
          >
            {t("editTabs.seo")}
          </TabsTrigger>
        </TabsList>
        <Button type="submit" form="new-article-form" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("new.submit")}
        </Button>
      </div>

      <div className="min-w-0">
        <form id="new-article-form" onSubmit={onSubmit} className="flex flex-col gap-5">
          <TabsContent
            value="content"
            forceMount
            className="m-0 focus-visible:outline-none"
          >
            <div className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label required>{t("form.moduleLabel")}</Label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label required>{t("form.sourceLanguageLabel")}</Label>
                  <Select value={sourceLocale} onValueChange={setSourceLocale}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title" required>
                    {t("form.titleLabel")}
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder={t("form.titlePlaceholder")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="slug" required>
                    {t("form.slugLabel")}
                  </Label>
                  <Input
                    id="slug"
                    name="slug"
                    required
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    placeholder={t("form.slugPlaceholder")}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  />
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("form.slugHint")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="excerpt">{t("form.excerptLabel")}</Label>
                <Textarea
                  id="excerpt"
                  name="excerpt"
                  rows={2}
                  maxLength={400}
                  placeholder={t("form.excerptHint")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label required>{t("form.bodyLabel")}</Label>
                <AccentColorField
                  value={accentColor}
                  onChange={setAccentColor}
                  label={t("form.accentColorLabel")}
                  hint={t("form.accentColorHint")}
                />
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  accentColor={accentColor}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="seo"
            forceMount
            className="m-0 focus-visible:outline-none"
          >
            <div className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label required>{t("form.difficultyLabel")}</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as typeof difficulty)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">
                        {t("form.difficulty.beginner")}
                      </SelectItem>
                      <SelectItem value="INTERMEDIATE">
                        {t("form.difficulty.intermediate")}
                      </SelectItem>
                      <SelectItem value="ADVANCED">
                        {t("form.difficulty.advanced")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("form.difficultyHint")}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <ImageUpload
                    name="coverImage"
                    label={t("form.coverImageLabel")}
                    placeholder={t("form.coverImagePlaceholder")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="metaTitle">{t("form.metaTitleLabel")}</Label>
                  <Input
                    id="metaTitle"
                    name="metaTitle"
                    maxLength={160}
                    placeholder={t("form.metaTitlePlaceholder")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="metaDescription">
                    {t("form.metaDescriptionLabel")}
                  </Label>
                  <Input
                    id="metaDescription"
                    name="metaDescription"
                    maxLength={280}
                    placeholder={t("form.metaDescriptionHint")}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </form>
      </div>
    </Tabs>
  );
}

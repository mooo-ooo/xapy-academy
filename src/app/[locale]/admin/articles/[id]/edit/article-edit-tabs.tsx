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
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  setArticleStatusAction,
  updateArticleSourceAction,
  updateArticleStatsAction,
} from "../../actions";

type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type Status = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

/**
 * Vertical-tab orchestrator for the article-edit page. Folds the old long
 * single-page layout (source editor + tags + translators stacked) into four
 * tabs: Content / SEO & images / Tags / Translations. The source form
 * spans Content + SEO (one `<form>` with both `TabsContent`s as
 * descendants via `forceMount`, so FormData always includes every field).
 * Tags + Translations panels are passed in as ReactNode children.
 */
export function ArticleEditTabs({
  articleId,
  status,
  source,
  viewCount,
  likeCount,
  tagsContent,
  translationsContent,
}: {
  articleId: string;
  status: Status;
  source: {
    slug: string;
    title: string;
    excerpt: string;
    bodyMdx: string;
    metaTitle: string;
    metaDescription: string;
    difficulty: Difficulty;
    coverImage: string;
    ogImage: string;
  };
  viewCount: number;
  likeCount: number;
  tagsContent: React.ReactNode;
  translationsContent: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("admin.articles");
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState(source.bodyMdx);
  const [difficulty, setDifficulty] = useState<Difficulty>(source.difficulty);
  const [activeTab, setActiveTab] = useState("content");
  const [views, setViews] = useState(viewCount);
  const [likes, setLikes] = useState(likeCount);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateArticleSourceAction({
        articleId,
        slug: String(fd.get("slug") ?? ""),
        title: String(fd.get("title") ?? ""),
        excerpt: String(fd.get("excerpt") ?? ""),
        bodyMdx: body,
        metaTitle: String(fd.get("metaTitle") ?? ""),
        metaDescription: String(fd.get("metaDescription") ?? ""),
        difficulty,
        coverImage: String(fd.get("coverImage") ?? ""),
        ogImage: String(fd.get("ogImage") ?? ""),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.bodyChanged
          ? t("edit.savedBumped", { version: res.sourceVersion })
          : t("edit.saved"),
      );
      router.refresh();
    });
  }

  function setStatus(next: Status) {
    startTransition(async () => {
      const res = await setArticleStatusAction({ articleId, status: next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("edit.statusLine", { status: next }));
      router.refresh();
    });
  }

  function onSaveStats(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateArticleStatsAction({
        articleId,
        viewCount: views,
        likeCount: likes,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("statsForm.saved"));
      router.refresh();
    });
  }

  const isSourceTab = activeTab === "content" || activeTab === "seo";

  return (
    <Tabs
      orientation="vertical"
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col gap-4 md:flex-row md:gap-6"
    >
      <TabsList className="flex h-auto w-full flex-row items-stretch justify-start gap-1 overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 md:w-56 md:flex-col md:overflow-visible">
        <TabsTrigger
          value="content"
          title={t("editTabs.content")}
          className="justify-start truncate rounded-lg px-3 py-2 text-left"
        >
          {t("editTabs.content")}
        </TabsTrigger>
        <TabsTrigger
          value="seo"
          title={t("editTabs.seo")}
          className="justify-start truncate rounded-lg px-3 py-2 text-left"
        >
          {t("editTabs.seo")}
        </TabsTrigger>
        <TabsTrigger
          value="tags"
          title={t("editTabs.tags")}
          className="justify-start truncate rounded-lg px-3 py-2 text-left"
        >
          {t("editTabs.tags")}
        </TabsTrigger>
        <TabsTrigger
          value="translations"
          title={t("editTabs.translations")}
          className="justify-start truncate rounded-lg px-3 py-2 text-left"
        >
          {t("editTabs.translations")}
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          title={t("editTabs.stats")}
          className="justify-start truncate rounded-lg px-3 py-2 text-left"
        >
          {t("editTabs.stats")}
        </TabsTrigger>
      </TabsList>

      <div className="min-w-0 flex-1">
        <form onSubmit={onSave} className="flex flex-col gap-5">
          <TabsContent
            value="content"
            forceMount
            className="m-0 focus-visible:outline-none"
          >
            <div className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title" required>
                    {t("form.titleLabel")}
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    defaultValue={source.title}
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
                    defaultValue={source.slug}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    placeholder={t("form.slugPlaceholder")}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="excerpt">{t("form.excerptLabel")}</Label>
                <Textarea
                  id="excerpt"
                  name="excerpt"
                  rows={2}
                  maxLength={400}
                  defaultValue={source.excerpt}
                  placeholder={t("form.excerptHint")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label required>{t("edit.bodyLabel")}</Label>
                <TiptapEditor value={body} onChange={setBody} />
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
                    onValueChange={(v) => setDifficulty(v as Difficulty)}
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
                    initial={source.coverImage}
                    placeholder={t("form.coverImagePlaceholder")}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <ImageUpload
                    name="ogImage"
                    label={t("form.ogImageLabel")}
                    initial={source.ogImage}
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
                    defaultValue={source.metaTitle}
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
                    defaultValue={source.metaDescription}
                    placeholder={t("form.metaDescriptionHint")}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {isSourceTab && (
            <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] p-4 backdrop-blur">
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                {t("edit.saveSource")}
              </Button>
              {status !== "PUBLISHED" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStatus("PUBLISHED")}
                  disabled={pending}
                >
                  {t("edit.publishArticle")}
                </Button>
              )}
              {status === "PUBLISHED" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStatus("ARCHIVED")}
                  disabled={pending}
                >
                  {t("edit.archive")}
                </Button>
              )}
              {status === "ARCHIVED" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStatus("DRAFT")}
                  disabled={pending}
                >
                  {t("edit.moveToDraft")}
                </Button>
              )}
            </div>
          )}
        </form>

        <TabsContent
          value="tags"
          forceMount
          className="m-0 focus-visible:outline-none"
        >
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            {tagsContent}
          </div>
        </TabsContent>

        <TabsContent
          value="translations"
          forceMount
          className="m-0 focus-visible:outline-none"
        >
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            {translationsContent}
          </div>
        </TabsContent>

        <TabsContent
          value="stats"
          forceMount
          className="m-0 focus-visible:outline-none"
        >
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
              {t("statsForm.hint")}
            </p>
            <form onSubmit={onSaveStats} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="viewCount">
                    {t("statsForm.viewsLabel")}
                  </Label>
                  <Input
                    id="viewCount"
                    type="number"
                    min={0}
                    value={views}
                    onChange={(e) =>
                      setViews(Math.max(0, Number(e.target.value || 0)))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="likeCount">
                    {t("statsForm.likesLabel")}
                  </Label>
                  <Input
                    id="likeCount"
                    type="number"
                    min={0}
                    value={likes}
                    onChange={(e) =>
                      setLikes(Math.max(0, Number(e.target.value || 0)))
                    }
                  />
                </div>
              </div>
              <div>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 size={14} className="animate-spin" />}
                  {t("statsForm.save")}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

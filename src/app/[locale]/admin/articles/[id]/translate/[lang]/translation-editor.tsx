"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Loader2, Save, Send, CheckCheck, Wand2 } from "lucide-react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import { slugify } from "@/lib/utils";
import {
  saveTranslationAction,
  setTranslationStatusAction,
} from "../../../actions";

type Status = "PENDING" | "IN_PROGRESS" | "REVIEW" | "PUBLISHED";

export function TranslationEditor({
  articleId,
  locale,
  canPublish,
  source,
  initial,
  currentStatus,
}: {
  articleId: string;
  locale: string;
  canPublish: boolean;
  source: {
    title: string;
    excerpt: string;
    bodyHtml: string;
    metaTitle: string;
    metaDescription: string;
    slug: string;
  };
  initial: {
    slug: string;
    title: string;
    excerpt: string;
    bodyHtml: string;
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
  };
  currentStatus: Status;
}) {
  const router = useRouter();
  const t = useTranslations("admin.articles");
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  // The slug is auto-derived from title only when the user hasn't
  // edited it manually. Treat the initial provisional slug
  // (`<source-slug>-<lang>` from assignTranslator) as not-yet-customized
  // so the first title edit replaces it.
  const placeholderInitial = initial.slug === `${source.slug}-${locale}`;
  const [slugDirty, setSlugDirty] = useState(!placeholderInitial);
  const [body, setBody] = useState(initial.bodyHtml);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function onTitleChange(next: string) {
    setTitle(next);
    if (!slugDirty) setSlug(slugify(next));
  }
  function onSlugChange(next: string) {
    setSlug(next);
    setSlugDirty(true);
  }
  function regenerateSlug() {
    setSlug(slugify(title));
    setSlugDirty(false);
  }

  // Autosave debounce (3s after last change). Skips first mount.
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const timer = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 3_000);
    return () => clearTimeout(timer);
  }, [body]);

  function save(opts?: { submit?: boolean; publish?: boolean }) {
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const res = await saveTranslationAction({
        articleId,
        locale,
        slug,
        title,
        excerpt: String(fd.get("excerpt") ?? ""),
        bodyHtml: body,
        metaTitle: String(fd.get("metaTitle") ?? ""),
        metaDescription: String(fd.get("metaDescription") ?? ""),
        ogImage: String(fd.get("ogImage") ?? ""),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSavedAt(new Date());
      if (opts?.submit) {
        const r = await setTranslationStatusAction({
          articleId,
          locale,
          status: "REVIEW",
        });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success(t("translate.submittedReview"));
        router.refresh();
      } else if (opts?.publish) {
        const r = await setTranslationStatusAction({
          articleId,
          locale,
          status: "PUBLISHED",
        });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success(t("translate.translationPublished"));
        router.refresh();
      } else if (!opts?.submit && !opts?.publish) {
        // Plain save — silent toast unless triggered by user button
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      {/* SOURCE */}
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--inset))] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
            {t("translate.sourceHeader")}
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          <ReadOnlyField label={t("form.titleLabel")} value={source.title} />
          <ReadOnlyField label={t("form.slugLabel")} value={source.slug} />
          <ReadOnlyField
            label={t("form.excerptLabel")}
            value={source.excerpt}
            multiline
          />
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
              {t("edit.bodyLabel")}
            </p>
            <RichTextEditor value={source.bodyHtml} readOnly className="bg-black/30" />
          </div>
          <ReadOnlyField label={t("form.metaTitleLabel")} value={source.metaTitle} />
          <ReadOnlyField
            label={t("form.metaDescriptionLabel")}
            value={source.metaDescription}
            multiline
          />
        </div>
      </section>

      {/* TARGET */}
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--accent-emerald))]">
            {t("translate.targetHeader", { locale: locale.toUpperCase() })}
          </h3>
          {savedAt && (
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {t("translate.savedAt", { time: savedAt.toLocaleTimeString() })}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4">
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
              placeholder={t("translate.translatedTitlePlaceholder", {
                locale: locale.toUpperCase(),
              })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug" required>
              {t("form.slugLabel")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                placeholder={t("translate.translatedSlugPlaceholder")}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={regenerateSlug}
                title={t("translate.regenerateSlug")}
                aria-label={t("translate.regenerateSlug")}
              >
                <Wand2 size={14} />
              </Button>
            </div>
            {!slugDirty && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("translate.slugHint")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="excerpt">{t("form.excerptLabel")}</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              maxLength={400}
              defaultValue={initial.excerpt}
              placeholder={t("translate.translatedExcerptPlaceholder", {
                locale: locale.toUpperCase(),
              })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label required>{t("edit.bodyLabel")}</Label>
            <RichTextEditor value={body} onChange={setBody} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metaTitle">{t("form.metaTitleLabel")}</Label>
              <Input
                id="metaTitle"
                name="metaTitle"
                maxLength={160}
                defaultValue={initial.metaTitle}
                placeholder={t("translate.translatedMetaTitlePlaceholder", {
                  locale: locale.toUpperCase(),
                })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metaDescription">{t("form.metaDescriptionLabel")}</Label>
              <Input
                id="metaDescription"
                name="metaDescription"
                maxLength={280}
                defaultValue={initial.metaDescription}
                placeholder={t("translate.translatedMetaDescriptionPlaceholder")}
              />
            </div>
            <ImageUpload
              name="ogImage"
              label={t("form.ogImageLabel")}
              initial={initial.ogImage}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[hsl(var(--border))] pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {t("translate.saveDraft")}
            </Button>
            {currentStatus !== "REVIEW" && currentStatus !== "PUBLISHED" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => save({ submit: true })}
                disabled={pending}
              >
                <Send size={14} /> {t("translate.submitReview")}
              </Button>
            )}
            {canPublish && currentStatus !== "PUBLISHED" && (
              <Button
                type="button"
                onClick={() => save({ publish: true })}
                disabled={pending}
              >
                <CheckCheck size={14} /> {t("translate.publish")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </form>
  );
}

function ReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <div
        className={`rounded-lg border border-[hsl(var(--border))] bg-black/30 px-3 py-2 text-sm text-[hsl(var(--foreground))] ${
          multiline ? "min-h-[60px] whitespace-pre-wrap" : ""
        }`}
      >
        {value || (
          <span className="text-[hsl(var(--muted-foreground))]">—</span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import type { AppRole } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import {
  assignTranslatorAction,
  setTranslationStatusAction,
} from "../../actions";

type Translation = {
  locale: string;
  status: "PENDING" | "IN_PROGRESS" | "REVIEW" | "PUBLISHED";
  slug: string;
  translator: { id: string; name: string | null; email: string } | null;
  basedOnSourceVersion: number;
};

export function TranslatorAssignmentPanel({
  articleId,
  sourceLocale,
  sourceVersion,
  targetLocales,
  translations,
  ctvs,
}: {
  articleId: string;
  sourceLocale: string;
  sourceVersion: number;
  targetLocales: string[];
  translations: Translation[];
  ctvs: Array<{
    id: string;
    name: string | null;
    email: string;
    role: AppRole;
  }>;
}) {
  const router = useRouter();
  const t = useTranslations("admin.articles.translatorPanel");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {targetLocales.map((locale) => {
        const tr = translations.find((tr) => tr.locale === locale);
        return (
          <TranslationRow
            key={locale}
            articleId={articleId}
            sourceVersion={sourceVersion}
            locale={locale}
            tr={tr}
            ctvs={ctvs}
            pending={pending}
            onAssign={(translatorId) =>
              startTransition(async () => {
                const res = await assignTranslatorAction({
                  articleId,
                  locale,
                  translatorId,
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(
                  t("assignmentUpdated", { locale: locale.toUpperCase() }),
                );
                router.refresh();
              })
            }
            onPublish={() =>
              startTransition(async () => {
                const res = await setTranslationStatusAction({
                  articleId,
                  locale,
                  status: "PUBLISHED",
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(
                  t("translationPublished", { locale: locale.toUpperCase() }),
                );
                router.refresh();
              })
            }
          />
        );
      })}
      {targetLocales.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {t("noTargets")}
        </p>
      )}
    </div>
  );
}

function TranslationRow({
  articleId,
  sourceVersion,
  locale,
  tr,
  ctvs,
  pending,
  onAssign,
  onPublish,
}: {
  articleId: string;
  sourceVersion: number;
  locale: string;
  tr?: Translation;
  ctvs: Array<{
    id: string;
    name: string | null;
    email: string;
    role: AppRole;
  }>;
  pending: boolean;
  onAssign: (translatorId: string | null) => void;
  onPublish: () => void;
}) {
  const tPanel = useTranslations("admin.articles.translatorPanel");
  const tTrans = useTranslations("admin.translations");
  const [selected, setSelected] = useState(tr?.translator?.id ?? "");
  const isStale =
    tr && tr.basedOnSourceVersion < sourceVersion && tr.status === "PUBLISHED";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--inset))] p-4">
      <div className="flex min-w-[120px] items-center gap-2">
        <span className="font-mono text-sm uppercase tracking-[0.6px] text-[hsl(var(--foreground))]">
          {locale}
        </span>
        {tr && (
          <Badge
            tone={
              tr.status === "PUBLISHED"
                ? "published"
                : tr.status === "REVIEW"
                  ? "review"
                  : tr.status === "IN_PROGRESS"
                    ? "in_progress"
                    : "pending"
            }
          >
            {tr.status}
          </Badge>
        )}
        {isStale && <Badge tone="review">{tTrans("stale")}</Badge>}
      </div>

      <div className="flex flex-1 items-center gap-2">
        <Select
          value={selected}
          onValueChange={(v) => {
            setSelected(v);
            onAssign(v === "__none__" ? null : v);
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder={tPanel("assignPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{tPanel("unassigned")}</SelectItem>
            {ctvs.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name ?? c.email}{" "}
                <span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">
                  ({c.role})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pending && <Loader2 size={14} className="animate-spin" />}
      </div>

      <div className="flex items-center gap-2">
        {tr && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/admin/articles/${articleId}/translate/${locale}`}>
              {tPanel("openTranslation")}
            </Link>
          </Button>
        )}
        {tr && tr.status === "REVIEW" && (
          <Button size="sm" onClick={onPublish} disabled={pending}>
            {tPanel("publish")}
          </Button>
        )}
      </div>
    </div>
  );
}

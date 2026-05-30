"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  changePasswordAction,
  updateProfileAction,
} from "./actions";

export function ProfileForm({
  initial,
  locales,
  hasPassword,
}: {
  initial: {
    name: string;
    email: string;
    image: string;
    preferredLang: string;
  };
  locales: string[];
  hasPassword: boolean;
}) {
  const t = useTranslations("account.profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [lang, setLang] = useState(initial.preferredLang);

  function onSubmitProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfileAction({
        name,
        image: String(fd.get("image") ?? ""),
        preferredLang: lang,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <form onSubmit={onSubmitProfile} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              value={initial.email}
              disabled
              readOnly
              className="opacity-70"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("emailHint")}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder={t("namePlaceholder")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("preferredLangLabel")}</Label>
            <Select value={lang} onValueChange={setLang}>
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
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("preferredLangHint")}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("imageLabel")}</Label>
            <ImageUpload name="image" initial={initial.image} />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("imageHint")}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 size={14} className="animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </form>

      {hasPassword ? (
        <PasswordSection />
      ) : (
        <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--hover))] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
          {t("oauthOnly")}
        </p>
      )}
    </div>
  );
}

function PasswordSection() {
  const t = useTranslations("account.password");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await changePasswordAction({
        current: String(fd.get("current") ?? ""),
        next: String(fd.get("next") ?? ""),
        confirm: String(fd.get("confirm") ?? ""),
      });
      if (!res.ok) {
        toast.error(
          res.error === "WRONG_CURRENT"
            ? t("error.wrongCurrent")
            : res.error === "MISMATCH"
              ? t("error.mismatch")
              : res.error === "WEAK"
                ? t("error.weak")
                : res.error === "OAUTH_ONLY"
                  ? t("error.oauthOnly")
                  : t("error.generic"),
        );
        return;
      }
      toast.success(t("done"));
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  return (
    <div className="border-t border-[hsl(var(--border))] pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 text-sm font-medium text-[hsl(var(--foreground))] hover:underline"
      >
        {open ? t("hideToggle") : t("showToggle")}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current">{t("current")}</Label>
            <PasswordInput
              id="current"
              name="current"
              required
              autoComplete="current-password"
              placeholder={t("currentPlaceholder")}
              showLabel={t("show")}
              hideLabel={t("hide")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="next">{t("next")}</Label>
            <PasswordInput
              id="next"
              name="next"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("nextPlaceholder")}
              showLabel={t("show")}
              hideLabel={t("hide")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">{t("confirm")}</Label>
            <PasswordInput
              id="confirm"
              name="confirm"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("confirmPlaceholder")}
              showLabel={t("show")}
              hideLabel={t("hide")}
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending && <Loader2 size={14} className="animate-spin" />}
              {t("submit")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

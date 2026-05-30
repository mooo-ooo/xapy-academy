"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Copy, Loader2 } from "lucide-react";
import { createUserAction } from "../actions";

export function NewUserForm() {
  const router = useRouter();
  const t = useTranslations("admin.users.form");
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<"USER" | "CTV">("USER");
  const [preferredLang, setPreferredLang] = useState<"en" | "vi">("en");
  const [createdPassword, setCreatedPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUserAction({
        email: String(fd.get("email") ?? ""),
        name: String(fd.get("name") ?? ""),
        role,
        preferredLang,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCreatedPassword({ email: res.email, password: res.password });
      toast.success(t("submit"));
    });
  }

  if (createdPassword) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-6">
        <h2 className="text-base font-semibold text-emerald-200">
          {t("credentialsTitle")}
        </h2>
        <p className="mt-1 text-xs text-emerald-200/80">
          {t("credentialsHint")}
        </p>
        <dl className="mt-4 space-y-2 font-mono text-sm">
          <CopyableRow
            label={t("credentialsEmail")}
            value={createdPassword.email}
            copyToast={t("copied", { label: t("credentialsEmail") })}
          />
          <CopyableRow
            label={t("credentialsPassword")}
            value={createdPassword.password}
            copyToast={t("copied", { label: t("credentialsPassword") })}
          />
        </dl>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => router.push("/admin/users")}>{t("done")}</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCreatedPassword(null);
            }}
          >
            {t("createAnother")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" required>
          {t("emailLabel")}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder={t("emailPlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={t("nameHint")}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label required>{t("roleLabel")}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">{t("role.user")}</SelectItem>
              <SelectItem value="CTV">{t("role.ctv")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label required>{t("preferredLanguageLabel")}</Label>
          <Select
            value={preferredLang}
            onValueChange={(v) => setPreferredLang(v as typeof preferredLang)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("language.en")}</SelectItem>
              <SelectItem value="vi">{t("language.vi")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}

function CopyableRow({
  label,
  value,
  copyToast,
}: {
  label: string;
  value: string;
  copyToast: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/40 px-3 py-2">
      <div>
        <div className="text-[10px] uppercase tracking-[0.6px] text-emerald-300/70">
          {label}
        </div>
        <div className="text-[hsl(var(--foreground))]">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(copyToast);
        }}
        className="rounded-md p-1.5 text-emerald-200/80 transition-colors hover:bg-[hsl(var(--hover))] hover:text-white"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

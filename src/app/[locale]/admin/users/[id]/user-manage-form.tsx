"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { Copy, KeyRound, Loader2, Power } from "lucide-react";
import { VerticalTabsShell } from "@/components/admin/vertical-tabs-shell";
import {
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateAuthorProfileAction,
  updatePreferredLangAction,
  updateUserRoleAction,
} from "../actions";
import type { AppRole } from "@/lib/auth";
import { assignableRolesFor, canManageUser } from "@/lib/roles";

type Role = AppRole;
type AssignableRole = Exclude<AppRole, "ADMIN">;

export function UserManageForm({
  user,
  actorRole,
  actorId,
  locales,
}: {
  user: {
    id: string;
    role: Role;
    isActive: boolean;
    preferredLang: string;
    slug: string | null;
    bio: string | null;
    jobTitle: string | null;
    sameAs: string[];
    knowsAbout: string[];
  };
  actorRole: Role;
  actorId: string;
  locales: string[];
}) {
  const router = useRouter();
  const t = useTranslations("admin.users.manageForm");
  const tForm = useTranslations("admin.users.form");
  const [pending, startTransition] = useTransition();
  const manageable = canManageUser(actorRole, user.role);
  const isSelf = actorId === user.id;
  const canEditProfile = manageable || isSelf;
  const assignable = assignableRolesFor(actorRole);
  const [role, setRole] = useState<AssignableRole>(
    ((manageable ? (user.role as AssignableRole) : assignable[0]) ??
      "USER") as AssignableRole,
  );
  const [lang, setLang] = useState(user.preferredLang);
  const [resetPassword, setResetPassword] = useState<string | null>(null);

  // Author profile fields — sameAs / knowsAbout edited as one-per-line text.
  const [authorSlug, setAuthorSlug] = useState(user.slug ?? "");
  const [authorBio, setAuthorBio] = useState(user.bio ?? "");
  const [authorJobTitle, setAuthorJobTitle] = useState(user.jobTitle ?? "");
  const [authorSameAs, setAuthorSameAs] = useState(user.sameAs.join("\n"));
  const [authorKnowsAbout, setAuthorKnowsAbout] = useState(
    user.knowsAbout.join("\n"),
  );

  function saveAuthor() {
    const lines = (s: string) =>
      s
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    startTransition(async () => {
      const res = await updateAuthorProfileAction({
        userId: user.id,
        slug: authorSlug.trim() || undefined,
        bio: authorBio.trim() || undefined,
        jobTitle: authorJobTitle.trim() || undefined,
        sameAs: lines(authorSameAs),
        knowsAbout: lines(authorKnowsAbout),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAuthorSlug(res.slug);
      toast.success(t("authorUpdated"));
      router.refresh();
    });
  }

  function saveRole() {
    if (role === user.role) return;
    startTransition(async () => {
      const res = await updateUserRoleAction({ userId: user.id, role });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("roleUpdated"));
      router.refresh();
    });
  }

  function saveLang() {
    if (lang === user.preferredLang) return;
    startTransition(async () => {
      const res = await updatePreferredLangAction({
        userId: user.id,
        preferredLang: lang,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("langUpdated"));
      router.refresh();
    });
  }

  function toggleActive(next: boolean) {
    startTransition(async () => {
      const res = await toggleUserActiveAction({
        userId: user.id,
        isActive: next,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? t("userActivated") : t("userDeactivated"));
      router.refresh();
    });
  }

  function doResetPassword() {
    startTransition(async () => {
      const res = await resetUserPasswordAction({ userId: user.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResetPassword(res.password);
    });
  }

  const roleTab = !manageable ? (
    <p className="text-sm text-[hsl(var(--muted-foreground))]">
      {t("adminRoleLocked")}
    </p>
  ) : (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <Label>{t("roleLabel")}</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as AssignableRole)}
          disabled={pending}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assignable.includes("MODERATOR") && (
              <SelectItem value="MODERATOR">{tForm("role.moderator")}</SelectItem>
            )}
            {assignable.includes("CTV") && (
              <SelectItem value="CTV">{tForm("role.ctv")}</SelectItem>
            )}
            {assignable.includes("USER") && (
              <SelectItem value="USER">{tForm("role.user")}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={saveRole}
        disabled={pending || role === user.role}
        variant="secondary"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {t("saveRole")}
      </Button>
    </div>
  );

  const langTab = (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <Label>{t("langLabel")}</Label>
        <Select value={lang} onValueChange={setLang} disabled={pending}>
          <SelectTrigger className="mt-1.5">
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
      <Button
        onClick={saveLang}
        disabled={pending || lang === user.preferredLang}
        variant="secondary"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {t("saveLang")}
      </Button>
    </div>
  );

  const passwordTab = (
    <>
      <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
        {t("passwordHint")}
      </p>
      <Button variant="secondary" onClick={doResetPassword} disabled={pending}>
        <KeyRound size={14} /> {t("resetPassword")}
      </Button>
      {resetPassword && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 px-3 py-2 font-mono text-sm">
          <span className="text-[hsl(var(--foreground))]">{resetPassword}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(resetPassword);
              toast.success(t("passwordCopied"));
            }}
            className="rounded-md p-1.5 text-emerald-200/80 hover:bg-[hsl(var(--hover))] hover:text-white"
          >
            <Copy size={14} />
          </button>
        </div>
      )}
    </>
  );

  const accessTab = (
    <>
      <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
        {user.isActive ? t("activeMessage") : t("inactiveMessage")}
      </p>
      {user.isActive ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="danger" disabled={pending}>
              <Power size={14} /> {t("deactivate")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deactivateDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deactivateDialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="ghost">{t("deactivateDialog.cancel")}</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="danger" onClick={() => toggleActive(false)}>
                  {t("deactivateDialog.confirm")}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          variant="secondary"
          onClick={() => toggleActive(true)}
          disabled={pending}
        >
          <Power size={14} /> {t("reactivate")}
        </Button>
      )}
    </>
  );

  const authorTab = (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {t("authorHint")}
      </p>
      <div>
        <Label>{t("authorSlugLabel")}</Label>
        <Input
          className="mt-1.5"
          value={authorSlug}
          onChange={(e) => setAuthorSlug(e.target.value)}
          placeholder={t("authorSlugPlaceholder")}
          disabled={pending}
        />
      </div>
      <div>
        <Label>{t("authorJobTitleLabel")}</Label>
        <Input
          className="mt-1.5"
          value={authorJobTitle}
          onChange={(e) => setAuthorJobTitle(e.target.value)}
          placeholder={t("authorJobTitlePlaceholder")}
          disabled={pending}
        />
      </div>
      <div>
        <Label>{t("authorBioLabel")}</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={authorBio}
          onChange={(e) => setAuthorBio(e.target.value)}
          placeholder={t("authorBioPlaceholder")}
          disabled={pending}
        />
      </div>
      <div>
        <Label>{t("authorSameAsLabel")}</Label>
        <Textarea
          className="mt-1.5 font-mono text-xs"
          rows={3}
          value={authorSameAs}
          onChange={(e) => setAuthorSameAs(e.target.value)}
          placeholder={t("authorSameAsPlaceholder")}
          disabled={pending}
        />
      </div>
      <div>
        <Label>{t("authorKnowsAboutLabel")}</Label>
        <Textarea
          className="mt-1.5"
          rows={3}
          value={authorKnowsAbout}
          onChange={(e) => setAuthorKnowsAbout(e.target.value)}
          placeholder={t("authorKnowsAboutPlaceholder")}
          disabled={pending}
        />
      </div>
      <Button onClick={saveAuthor} disabled={pending} variant="secondary">
        {pending && <Loader2 size={14} className="animate-spin" />}
        {t("saveAuthor")}
      </Button>
    </div>
  );

  const lockedMsg = (
    <p className="text-sm text-[hsl(var(--muted-foreground))]">
      {t("adminRoleLocked")}
    </p>
  );

  return (
    <VerticalTabsShell
      tabs={[
        { key: "role", label: t("roleLabel"), content: roleTab },
        {
          key: "lang",
          label: t("langLabel"),
          content: canEditProfile ? langTab : lockedMsg,
        },
        {
          key: "author",
          label: t("authorTab"),
          content: canEditProfile ? authorTab : lockedMsg,
        },
        {
          key: "password",
          label: t("passwordTitle"),
          content: manageable ? passwordTab : lockedMsg,
        },
        {
          key: "access",
          label: t("accessTitle"),
          content: manageable ? accessTab : lockedMsg,
        },
      ]}
    />
  );
}

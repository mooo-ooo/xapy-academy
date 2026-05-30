"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { registerAction } from "./actions";

export function RegisterForm({
  oauthProviders,
}: {
  oauthProviders: Array<"google">;
}) {
  const t = useTranslations("register");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    requiresApproval: boolean;
  } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const name = String(fd.get("name") ?? "");

    if (password !== confirm) {
      setError(t("error.mismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("error.weak"));
      return;
    }

    startTransition(async () => {
      const res = await registerAction({ email, password, name, locale });
      if (!res.ok) {
        setError(
          res.error === "DISABLED"
            ? t("error.disabled")
            : res.error === "DUPLICATE"
              ? t("error.duplicate")
              : t("error.invalid"),
        );
        return;
      }
      if (res.requiresApproval) {
        setSuccess({ email: res.email, requiresApproval: true });
        return;
      }
      // Auto sign-in when approval not required
      const r = await signIn("credentials", {
        email: res.email,
        password,
        redirect: false,
      });
      if (r?.error) {
        setSuccess({ email: res.email, requiresApproval: false });
        return;
      }
      router.replace("/academy");
      router.refresh();
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 size={48} className="text-emerald-400" />
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
          {t("success.title")}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {success.requiresApproval
            ? t("success.pendingApproval", { email: success.email })
            : t("success.created", { email: success.email })}
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-6 text-sm font-medium text-[hsl(var(--background))] transition-opacity hover:opacity-90"
        >
          {t("success.goToLogin")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {oauthProviders.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {oauthProviders.includes("google") && (
              <OAuthButton
                label={t("oauth.google")}
                onClick={() =>
                  signIn("google", { callbackUrl: `/${locale}/academy` })
                }
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[1px] text-[hsl(var(--muted-foreground))]">
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
            {t("orWithEmail")}
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("name")} required={false}>
          <input
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm text-[hsl(var(--foreground))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent-emerald))]"
          />
        </Field>

        <Field label={t("email")} required>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm text-[hsl(var(--foreground))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent-emerald))]"
          />
        </Field>

        <Field label={t("password")} required>
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("passwordHint")}
            showLabel={t("passwordShow")}
            hideLabel={t("passwordHide")}
            className="h-11 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          />
        </Field>

        <Field label={t("confirmPassword")} required>
          <PasswordInput
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("confirmPlaceholder")}
            showLabel={t("passwordShow")}
            hideLabel={t("passwordHide")}
            className="h-11 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          />
        </Field>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-6 text-sm font-medium text-[hsl(var(--background))] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {t("submit")}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-400">
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function OAuthButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--hover))]"
    >
      <GoogleLogo />
      {label}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.96A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.96 4.042l3.004-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .96 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm({
  next,
  initialError,
  oauthProviders = [],
  orWithEmailLabel,
  oauthLabels,
}: {
  next?: string;
  initialError?: string;
  oauthProviders?: Array<"google">;
  orWithEmailLabel?: string;
  oauthLabels?: { google: string };
}) {
  const locale = useLocale();
  const t = useTranslations("login");
  const tReg = useTranslations("register");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setError(t("error.invalid"));
        return;
      }
      router.replace(next || "/academy");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {oauthProviders.length > 0 && oauthLabels && (
        <>
          <div className="flex flex-col gap-2">
            {oauthProviders.includes("google") && (
              <button
                type="button"
                onClick={() =>
                  signIn("google", { callbackUrl: next || `/${locale}/academy` })
                }
                className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--hover))]"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.96A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.96 4.042l3.004-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .96 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                {oauthLabels.google}
              </button>
            )}
          </div>
          {orWithEmailLabel && (
            <div className="flex items-center gap-3 text-xs uppercase tracking-[1px] text-[hsl(var(--muted-foreground))]">
              <span className="h-px flex-1 bg-[hsl(var(--border))]" />
              {orWithEmailLabel}
              <span className="h-px flex-1 bg-[hsl(var(--border))]" />
            </div>
          )}
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          {t("email")}
          <span aria-hidden="true" className="ml-0.5 text-red-400">
            *
          </span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-sm text-[hsl(var(--foreground))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent-emerald))]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
          {t("password")}
          <span aria-hidden="true" className="ml-0.5 text-red-400">
            *
          </span>
        </span>
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder={tReg("passwordHint")}
          showLabel={tReg("passwordShow")}
          hideLabel={tReg("passwordHide")}
          className="h-11 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--background))]"
        />
      </label>

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

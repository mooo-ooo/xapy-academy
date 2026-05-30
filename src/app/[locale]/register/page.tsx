import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { auth, configuredOAuthProviders } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "register" });
  // noindex + follow (no self-canonical): see login/page.tsx.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session) {
    redirect({ href: "/academy", locale });
  }

  // Hard-block when admin has disabled self-signup. Mirrors the
  // server-action check, but also keeps the page from rendering at all
  // so search engines / probes can't find a working form.
  const settings = await prisma.siteSetting.findUnique({
    where: { id: 1 },
    select: { allowSelfSignup: true },
  });
  if (settings && !settings.allowSelfSignup) {
    notFound();
  }

  const t = await getTranslations("register");
  const providers = configuredOAuthProviders();

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-8 shadow-xl">
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            {t("title")}
          </h1>
          <p className="mb-8 text-sm text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
          <RegisterForm oauthProviders={providers} />
          <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
            {t("haveAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-[hsl(var(--accent-emerald))] hover:underline"
            >
              {t("loginLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

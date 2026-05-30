import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { auth, configuredOAuthProviders } from "@/lib/auth";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  // noindex + follow (no self-canonical): auth pages must not be indexed,
  // but link-equity should still flow. Crawlable (not robots-disallowed) so
  // the directive is actually read.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session) {
    const sp = await searchParams;
    redirect({ href: sp.next ?? "/academy", locale });
  }

  const sp = await searchParams;
  const t = await getTranslations("login");
  const tReg = await getTranslations("register");
  const settings = await prisma.siteSetting.findUnique({
    where: { id: 1 },
    select: { allowSelfSignup: true },
  });
  const showRegisterLink = settings?.allowSelfSignup ?? true;
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
          <LoginForm
            next={sp.next}
            initialError={sp.error}
            oauthProviders={providers}
            orWithEmailLabel={tReg("orWithEmail")}
            oauthLabels={{ google: tReg("oauth.google") }}
          />
          {showRegisterLink && (
            <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
              {tReg("noAccount")}{" "}
              <Link
                href="/register"
                className="font-medium text-[hsl(var(--accent-emerald))] hover:underline"
              >
                {tReg("registerLink")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

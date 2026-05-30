import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";
import { getEnabledLocales } from "@/lib/data/site";

export async function Header() {
  const t = await getTranslations("header");
  const [session, enabled] = await Promise.all([auth(), getEnabledLocales()]);
  const locales = enabled as unknown as string[];

  return (
    <nav
      className="academy-navbar academy-navbar-sticky sticky top-0 z-50 px-4 py-4 backdrop-blur-md sm:px-6"
      style={{
        fontFamily: "var(--font-system)",
        fontSize: 14,
        fontWeight: 400,
        lineHeight: "21px",
        letterSpacing: "0.6px",
      }}
    >
      <div className="academy-navbar-container mx-auto flex h-10 w-full max-w-[1280px] items-center justify-between gap-3 text-[hsl(var(--foreground))]">
        <Logo />
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <LanguageSwitcher isAuthenticated={!!session} locales={locales} />
          <ThemeToggle />
          {session?.user ? (
            <UserMenu
              name={session.user.name ?? null}
              email={session.user.email ?? ""}
              role={session.user.role}
            />
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

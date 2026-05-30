import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSetting } from "@/lib/data/site";
import { routing } from "@/i18n/routing";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin.settings" });
  const settings = await getSiteSetting();

  // The {envVar} placeholder in the subtitle is rendered as a real
  // <code> tag — splitting around the marker keeps the JSX clean.
  const subtitle = t("subtitle", { envVar: "__ENVVAR__" });
  const [before, after] = subtitle.split("__ENVVAR__");

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          {t("title")}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {before}
          <code className="rounded bg-[hsl(var(--hover))] px-1.5 py-0.5 font-mono text-xs">
            PUBLIC_LOCALE
          </code>
          {after}
        </p>
      </div>

      <SettingsForm
        initial={settings}
        allLocales={routing.locales as unknown as string[]}
      />
    </div>
  );
}

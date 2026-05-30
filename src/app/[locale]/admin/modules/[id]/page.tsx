import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { ModuleForm } from "@/components/admin/module-form";
import { ModuleTranslationsEditor } from "@/components/admin/module-translations-editor";
import { VerticalTabsShell } from "@/components/admin/vertical-tabs-shell";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.modules" });

  const mod = await prisma.module.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!mod) notFound();

  const locales = routing.locales as unknown as string[];
  const byLocale = Object.fromEntries(
    locales.map((l) => [l, mod.translations.find((t) => t.locale === l)]),
  );

  return (
    <div>
      <Link
        href="/admin/modules"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToModules")}
      </Link>

      <h1 className="mb-8 text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
        {mod.translations.find((tr) => tr.locale === "en")?.name ?? mod.slug}
      </h1>

      <VerticalTabsShell
        tabs={[
          {
            key: "settings",
            label: t("edit.moduleSettings"),
            content: (
              <ModuleForm
                initial={{
                  id: mod.id,
                  slug: mod.slug,
                  icon: mod.icon ?? "",
                  sortOrder: mod.sortOrder,
                  isPublic: mod.isPublic,
                }}
              />
            ),
          },
          {
            key: "translations",
            label: t("edit.translations"),
            content: (
              <ModuleTranslationsEditor
                moduleId={mod.id}
                locales={locales}
                initialByLocale={byLocale}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

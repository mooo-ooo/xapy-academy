import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { routing } from "@/i18n/routing";
import { TagTranslationsEditor } from "@/components/admin/tag-translations-editor";
import { TrendingToggle } from "@/components/admin/tag-row-actions";
import { VerticalTabsShell } from "@/components/admin/vertical-tabs-shell";

export const dynamic = "force-dynamic";

export default async function EditTagPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.tags" });

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!tag) notFound();

  const locales = routing.locales as unknown as string[];
  const byLocale = Object.fromEntries(
    locales.map((l) => [
      l,
      tag.translations.find((tr) => tr.locale === l)?.name,
    ]),
  );

  return (
    <div>
      <Link
        href="/admin/tags"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToTags")}
      </Link>

      <h1 className="mb-8 text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
        {tag.translations.find((tr) => tr.locale === "en")?.name ?? tag.slug}
        <span className="ml-2 font-mono text-sm font-normal text-[hsl(var(--muted-foreground))]">
          {tag.slug}
        </span>
      </h1>

      <VerticalTabsShell
        tabs={[
          {
            key: "settings",
            label: t("edit.settings"),
            content: (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
                    {t("form.slugLabel")}
                  </p>
                  <code className="block rounded-lg border border-[hsl(var(--border))] bg-black/30 px-3 py-2 font-mono text-sm">
                    {tag.slug}
                  </code>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.6px] text-[hsl(var(--muted-foreground))]">
                    {t("table.trending")}
                  </p>
                  <TrendingToggle id={tag.id} isTrending={tag.isTrending} />
                </div>
              </div>
            ),
          },
          {
            key: "translations",
            label: t("edit.translations"),
            content: (
              <TagTranslationsEditor
                tagId={tag.id}
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

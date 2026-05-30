import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { ModuleForm } from "@/components/admin/module-form";

export default async function NewModulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.modules" });
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/admin/modules"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToModules")}
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
        {t("new.title")}
      </h1>
      <p className="mb-8 text-sm text-[hsl(var(--muted-foreground))]">
        {t("new.subtitle")}
      </p>
      <ModuleForm />
    </div>
  );
}

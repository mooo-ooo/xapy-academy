import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserManageForm } from "./user-manage-form";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function ManageUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin.users" });

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      preferredLang: true,
      isActive: true,
      createdAt: true,
      slug: true,
      bio: true,
      jobTitle: true,
      sameAs: true,
      knowsAbout: true,
      createdBy: { select: { email: true, name: true } },
    },
  });
  if (!user) notFound();
  const session = (await auth())!;
  const locales = routing.locales as unknown as string[];
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft size={14} /> {t("backToUsers")}
      </Link>

      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
          {user.name ?? user.email}
          <Badge
            tone={
              user.role === "ADMIN" || user.role === "MODERATOR"
                ? "admin"
                : user.role === "CTV"
                  ? "ctv"
                  : "user"
            }
          >
            {user.role}
          </Badge>
          {!user.isActive && <Badge tone="archived">{t("status.inactive")}</Badge>}
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {user.email} · joined {user.createdAt.toLocaleDateString()}
          {user.createdBy && (
            <span>
              {" "}· created by {user.createdBy.name ?? user.createdBy.email}
            </span>
          )}
        </p>
      </header>

      <UserManageForm
        user={{
          id: user.id,
          role: user.role,
          isActive: user.isActive,
          preferredLang: user.preferredLang,
          slug: user.slug,
          bio: user.bio,
          jobTitle: user.jobTitle,
          sameAs: toStringArray(user.sameAs),
          knowsAbout: toStringArray(user.knowsAbout),
        }}
        actorRole={session.user.role}
        actorId={session.user.id}
        locales={locales}
      />
    </div>
  );
}

import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { isAdminLevel } from "@/lib/roles";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Toaster } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }
  if (!isAdminLevel(session!.user.role) && session!.user.role !== "CTV") {
    redirect({ href: "/academy", locale });
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={session!.user.role} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-none px-6 py-10 2xl:px-10">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

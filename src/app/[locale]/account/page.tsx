import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Heart, History, UserRound } from "lucide-react";
import { ArticleCard } from "@/components/academy/article-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEnabledLocales } from "@/lib/data/site";
import { resolveLocaleForRequest } from "@/lib/data/locale-policy";
import {
  countUserLikes,
  countUserViews,
  listUserLikedArticles,
  listUserViewedArticles,
  type UserArticleListItem,
} from "@/lib/data/user-history";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/login?next=/account", locale });
  }

  const sp = await searchParams;
  const tab = sp.tab === "likes" || sp.tab === "history" ? sp.tab : "profile";

  const { effective } = await resolveLocaleForRequest(locale);
  const t = await getTranslations({ locale, namespace: "account" });

  const userId = session!.user.id;
  const [user, likes, history, likeCount, viewCount, enabledLocales] =
    await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        preferredLang: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      },
    }),
    listUserLikedArticles(userId, effective, 50),
    listUserViewedArticles(userId, effective, 50),
    countUserLikes(userId),
    countUserViews(userId),
    getEnabledLocales(),
  ]);
  if (!user) redirect({ href: "/login", locale });

  const initial = (user!.name || user!.email).slice(0, 2).toUpperCase();
  const supportedLocales = enabledLocales as unknown as string[];

  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 pt-16 pb-24">
      <header className="mb-10 flex flex-wrap items-center gap-5">
        {user!.image ? (
          <img
            src={user!.image}
            alt={user!.name ?? user!.email}
            className="h-16 w-16 rounded-full border border-[hsl(var(--border))] object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card-hover))] text-lg font-semibold text-[hsl(var(--foreground))]">
            {initial}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            {user!.name || user!.email}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {user!.email}
            <span className="mx-2 opacity-50">·</span>
            {user!.role}
            <span className="mx-2 opacity-50">·</span>
            {t("memberSince", { date: user!.createdAt.toLocaleDateString() })}
          </p>
        </div>
      </header>

      <Tabs defaultValue={tab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">
            <UserRound size={14} className="mr-1.5" />
            {t("tabs.profile")}
          </TabsTrigger>
          <TabsTrigger value="likes">
            <Heart size={14} className="mr-1.5" />
            {t("tabs.likes", { count: likeCount })}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={14} className="mr-1.5" />
            {t("tabs.history", { count: viewCount })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm
            initial={{
              name: user!.name ?? "",
              email: user!.email,
              image: user!.image ?? "",
              preferredLang: user!.preferredLang,
            }}
            locales={supportedLocales}
            hasPassword={!!user!.passwordHash}
          />
        </TabsContent>

        <TabsContent value="likes">
          <UserCardGrid
            items={likes}
            emptyLabel={t("likes.empty")}
            emptyAction={
              <Link
                href="/academy"
                className="text-sm font-medium text-[hsl(var(--accent-emerald))] hover:underline"
              >
                {t("likes.browse")}
              </Link>
            }
            metaPrefix={(at) => t("likes.likedAt", { time: relativeTime(at) })}
          />
        </TabsContent>

        <TabsContent value="history">
          <UserCardGrid
            items={history}
            emptyLabel={t("history.empty")}
            emptyAction={
              <Link
                href="/academy"
                className="text-sm font-medium text-[hsl(var(--accent-emerald))] hover:underline"
              >
                {t("history.browse")}
              </Link>
            }
            metaPrefix={(at, vc) =>
              t("history.lastViewed", {
                time: relativeTime(at),
                count: vc ?? 1,
              })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserCardGrid({
  items,
  emptyLabel,
  emptyAction,
  metaPrefix,
}: {
  items: UserArticleListItem[];
  emptyLabel: string;
  emptyAction?: React.ReactNode;
  metaPrefix: (at: Date, viewCount: number | undefined) => string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-16 text-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {emptyLabel}
        </p>
        {emptyAction}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => (
        <div key={a.id} className="flex flex-col gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {metaPrefix(a.at, a.viewCount)}
          </span>
          <ArticleCard moduleSlug={a.moduleSlug} article={a} />
        </div>
      ))}
    </div>
  );
}

/** Coarse "5 minutes ago" / "2 hours ago" / "Jan 15" formatter — no
 *  intl-relative-format dep, server-rendered so locale awareness is
 *  limited to the date threshold. */
function relativeTime(at: Date): string {
  const ms = Date.now() - at.getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return at.toLocaleDateString();
}

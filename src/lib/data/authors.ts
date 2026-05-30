import { cache } from "react";
import { prisma } from "@/lib/db";

export type AuthorProfile = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  jobTitle: string | null;
  image: string | null;
  sameAs: string[];
  knowsAbout: string[];
};

function toStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

/**
 * Public author profile by slug. Returns null unless the user has a slug
 * AND at least one PUBLISHED article with a PUBLISHED translation — so only
 * genuine, citable authors get an indexable /authors page.
 *
 * Cached per request via React `cache`.
 */
export const getAuthorBySlug = cache(
  async (slug: string): Promise<AuthorProfile | null> => {
    if (!slug) return null;
    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        bio: true,
        jobTitle: true,
        image: true,
        sameAs: true,
        knowsAbout: true,
      },
    });
    if (!user || !user.slug) return null;

    const publishedCount = await prisma.article.count({
      where: {
        authorId: user.id,
        status: "PUBLISHED",
        translations: { some: { status: "PUBLISHED" } },
      },
    });
    if (publishedCount === 0) return null;

    return {
      id: user.id,
      name: user.name ?? user.email.split("@")[0],
      slug: user.slug,
      bio: user.bio,
      jobTitle: user.jobTitle,
      image: user.image,
      sameAs: toStringArray(user.sameAs),
      knowsAbout: toStringArray(user.knowsAbout),
    };
  },
);

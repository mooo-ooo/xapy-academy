import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Server-side check: has THIS user liked THIS article?
 * Single composite-PK lookup — O(1) with the index.
 *
 * Cached per request via React `cache` so multiple components on
 * the same page (header LikeButton + future inline-CTA) share one
 * query.
 */
export const hasUserLikedArticle = cache(
  async (userId: string | null | undefined, articleId: string) => {
    if (!userId) return false;
    const row = await prisma.articleLike.findUnique({
      where: { userId_articleId: { userId, articleId } },
      select: { userId: true },
    });
    return !!row;
  },
);

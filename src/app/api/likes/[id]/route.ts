import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST   /api/likes/:id  → user likes the article (idempotent)
 * DELETE /api/likes/:id  → user unlikes (idempotent)
 * GET    /api/likes/:id  → { liked, likeCount, isAuthenticated }
 *
 * Requires an authenticated session for mutations. Likes are stored in
 * `ArticleLike` (composite PK on (userId, articleId) → can't double-like
 * by definition). `Article.likeCount` is the denormalized counter we
 * keep on the row for fast list-rendering — both are maintained in a
 * single transaction so they can't drift under concurrent calls.
 */

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const article = await prisma.article.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!article || article.status !== "PUBLISHED") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.articleLike.create({
          data: { userId: session.user.id, articleId: id },
        });
        const row = await tx.article.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        });
        return { likeCount: row.likeCount, alreadyLiked: false };
      } catch (err) {
        // P2002 = unique constraint → user already liked this article
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          const row = await tx.article.findUnique({
            where: { id },
            select: { likeCount: true },
          });
          return { likeCount: row?.likeCount ?? 0, alreadyLiked: true };
        }
        throw err;
      }
    });
    return NextResponse.json({ ok: true, liked: true, ...result });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.articleLike.deleteMany({
        where: { userId: session.user.id, articleId: id },
      });
      if (deleted.count === 0) {
        // Wasn't liked — nothing to decrement.
        const row = await tx.article.findUnique({
          where: { id },
          select: { likeCount: true },
        });
        return { likeCount: row?.likeCount ?? 0, wasLiked: false };
      }
      // Clamp at 0 to guard against drift.
      await tx.$executeRaw`UPDATE Article SET likeCount = GREATEST(likeCount - 1, 0) WHERE id = ${id}`;
      const row = await tx.article.findUnique({
        where: { id },
        select: { likeCount: true },
      });
      return { likeCount: row?.likeCount ?? 0, wasLiked: true };
    });
    return NextResponse.json({ ok: true, liked: false, ...result });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await ctx.params;
  const [article, mine] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      select: { likeCount: true },
    }),
    session?.user
      ? prisma.articleLike.findUnique({
          where: {
            userId_articleId: { userId: session.user.id, articleId: id },
          },
          select: { userId: true },
        })
      : Promise.resolve(null),
  ]);
  if (!article) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    liked: !!mine,
    likeCount: article.likeCount,
    isAuthenticated: !!session?.user,
  });
}

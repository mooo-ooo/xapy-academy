/**
 * Import the JSON produced by tools/crawl-articles.ts into our DB.
 *
 *   pnpm db:seed:crawl
 *
 * Behaviour
 *   - Article anchored on (locale='en', slug). Idempotent — re-running
 *     just updates fields.
 *   - Category pill from the crawl is mapped to one of our seeded
 *     modules via NAME_TO_MODULE. Unknown categories auto-create a
 *     module with a placeholder EN translation so cards still link
 *     somewhere reasonable.
 *
 * The body is the turndown'd Markdown. We DO NOT prefix or post-process
 * — what the site published is what we render.
 */

import { PrismaClient, type Difficulty } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const prisma = new PrismaClient();

type Crawled = {
  url: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  authorName: string | null;
  authorInitial: string | null;
  publishedAtRaw: string | null;
  readingMinutes: number | null;
  difficulty: string | null;
  likeCount: number | null;
  coverImage: string | null;
  bodyMd: string;
};

const NAME_TO_MODULE: Array<{
  match: RegExp;
  slug: string;
  defaultName: string;
  icon: string;
}> = [
  { match: /order ?flow/i, slug: "order-flow-footprints", defaultName: "Order Flow Footprints", icon: "Activity" },
  { match: /footprint/i, slug: "order-flow-footprints", defaultName: "Order Flow Footprints", icon: "Activity" },
  { match: /tpo|profile|market profile/i, slug: "tpo-profile", defaultName: "TPO & Profile", icon: "BarChart3" },
  { match: /technical/i, slug: "technical-analysis", defaultName: "Technical Analysis", icon: "LineChart" },
  { match: /price ?action/i, slug: "technical-analysis", defaultName: "Technical Analysis", icon: "LineChart" },
  { match: /psychology/i, slug: "psychology", defaultName: "Psychology", icon: "Brain" },
  { match: /options? ?greeks?/i, slug: "options-greeks", defaultName: "Options Greeks", icon: "Sigma" },
  { match: /algorithmic|strategy/i, slug: "algorithmic", defaultName: "Algorithmic", icon: "Code2" },
];

function resolveModule(category: string | null) {
  if (!category) return NAME_TO_MODULE[0];
  for (const m of NAME_TO_MODULE) {
    if (m.match.test(category)) return m;
  }
  return NAME_TO_MODULE[0];
}

function difficultyEnum(s: string | null): Difficulty {
  if (!s) return "BEGINNER";
  const u = s.toUpperCase();
  if (u === "BEGINNER" || u === "INTERMEDIATE" || u === "ADVANCED")
    return u as Difficulty;
  return "BEGINNER";
}

async function ensureModule(spec: {
  slug: string;
  defaultName: string;
  icon: string;
}) {
  let mod = await prisma.module.findUnique({ where: { slug: spec.slug } });
  if (!mod) {
    mod = await prisma.module.create({
      data: {
        slug: spec.slug,
        icon: spec.icon,
        isPublic: true,
        sortOrder: 100,
      },
    });
    await prisma.moduleTranslation.upsert({
      where: { moduleId_locale: { moduleId: mod.id, locale: "en" } },
      update: { name: spec.defaultName },
      create: {
        moduleId: mod.id,
        locale: "en",
        name: spec.defaultName,
      },
    });
    console.log(`  + module ${spec.slug} (auto-created)`);
  }
  return mod;
}

async function main() {
  const input = JSON.parse(
    await readFile(
      join(process.cwd(), "tools", "output", "crawled-articles.json"),
      "utf8",
    ),
  ) as Crawled[];
  console.log(`→ Importing ${input.length} crawled articles…\n`);

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("✗ no admin user — run pnpm db:seed first");
    process.exit(1);
  }

  let imported = 0;
  let updated = 0;
  for (const a of input) {
    const moduleSpec = resolveModule(a.category);
    const mod = await ensureModule(moduleSpec);

    // Normalize slug — crawled slugs end with a random suffix; keep as-is.
    const slug = a.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const existing = await prisma.articleTranslation.findUnique({
      where: { locale_slug: { locale: "en", slug } },
      include: { article: true },
    });

    const now = new Date();
    let articleId: string;
    if (existing) {
      articleId = existing.articleId;
      await prisma.article.update({
        where: { id: articleId },
        data: {
          moduleId: mod.id,
          status: "PUBLISHED",
          difficulty: difficultyEnum(a.difficulty),
          likeCount: a.likeCount ?? existing.article.likeCount,
          coverImage: a.coverImage ?? existing.article.coverImage,
          publishedAt: existing.article.publishedAt ?? now,
        },
      });
      updated++;
    } else {
      const created = await prisma.article.create({
        data: {
          moduleId: mod.id,
          authorId: admin.id,
          status: "PUBLISHED",
          sourceLocale: "en",
          difficulty: difficultyEnum(a.difficulty),
          likeCount: a.likeCount ?? 0,
          coverImage: a.coverImage,
          publishedAt: now,
        },
      });
      articleId = created.id;
      imported++;
    }

    await prisma.articleTranslation.upsert({
      where: { articleId_locale: { articleId, locale: "en" } },
      update: {
        slug,
        title: a.title,
        excerpt: a.excerpt,
        bodyMdx: a.bodyMd || "*(empty body from crawl)*",
        status: "PUBLISHED",
        publishedAt: now,
        basedOnSourceVersion: 1,
      },
      create: {
        articleId,
        locale: "en",
        slug,
        title: a.title,
        excerpt: a.excerpt,
        bodyMdx: a.bodyMd || "*(empty body from crawl)*",
        status: "PUBLISHED",
        publishedAt: now,
        basedOnSourceVersion: 1,
      },
    });
    console.log(
      `  ✓ ${slug.slice(0, 56).padEnd(56, " ")}  ${moduleSpec.slug}`,
    );
  }

  console.log(
    `\nDone — ${imported} new, ${updated} updated, ${input.length} total.\n`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

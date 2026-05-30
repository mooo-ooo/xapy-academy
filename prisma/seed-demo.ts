/**
 * Demo content seed — optional. Run AFTER prisma/seed.ts.
 *   pnpm db:seed:demo
 *
 * Adds:
 *   - 3 trending tags (delta, vwap, liquidity) with EN+VI translations
 *   - 1 published article (delta-explained / delta-la-gi) in the
 *     "order-flow-footprints" module, EN + VI
 *
 * Idempotent — re-running upserts.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ENGLISH_BODY = `## What delta actually measures

Delta is the difference between **aggressive buy volume** and **aggressive sell volume** over a chosen time window.
A positive delta means market buyers consumed more resting offers than market sellers consumed bids during that window.

> Delta is a *flow* metric, not a price metric. Two bars can close at the same level with wildly different delta signatures.

## How to read footprint delta

When you watch an intraday chart, three patterns matter:

- **Delta divergence** — price prints a new high but delta is flat or negative. Bulls are exhausting.
- **Delta absorption** — delta surges in one direction while price doesn't move. A large passive participant is absorbing the flow.
- **Delta confirmation** — delta and price move together. Trend continuation is more likely.

### A quick example

\`\`\`text
Bar A:  +1,240Δ  close +0.50
Bar B:  +1,180Δ  close -0.25  ← divergence
Bar C:    -420Δ  close -0.75  ← confirmation
\`\`\`

## Common mistakes

1. **Treating delta as predictive on its own.** Always pair with structure and a context tool (VWAP, profile, key levels).
2. **Ignoring time of day.** Open-bell delta has different signal-to-noise than midday chop.
3. **Skipping the higher-timeframe footprint.** A 1-minute divergence inside a higher-timeframe trend is rarely tradable in isolation.

## Where to go next

If you found this useful, the [TPO & Profile](/academy/tpo-profile) module pairs naturally with order-flow reading — profile gives you the *where*, footprints give you the *who*.
`;

const VIETNAMESE_BODY = `## Delta đo cái gì

Delta là **hiệu giữa khối lượng mua chủ động và bán chủ động** trong một khung thời gian. Delta dương = lực mua thị trường nuốt nhiều ask hơn lực bán nuốt bid trong khung đó.

> Delta là một chỉ báo *dòng tiền* — không phải chỉ báo giá. Hai bar có thể đóng cùng mức nhưng delta khác biệt rõ rệt.

## Đọc delta trên footprint

Khi xem chart intraday, có ba pattern đáng chú ý:

- **Phân kỳ delta** — giá phá đỉnh mới nhưng delta đi ngang hoặc âm. Phe mua đang đuối sức.
- **Hấp thụ delta** — delta tăng mạnh một phía nhưng giá đứng yên. Một bên passive lớn đang hấp thụ dòng lệnh.
- **Xác nhận delta** — delta và giá chuyển động cùng chiều. Khả năng tiếp diễn xu hướng cao hơn.

### Ví dụ nhanh

\`\`\`text
Bar A:  +1,240Δ  đóng +0.50
Bar B:  +1,180Δ  đóng -0.25  ← phân kỳ
Bar C:    -420Δ  đóng -0.75  ← xác nhận
\`\`\`

## Lỗi thường gặp

1. **Coi delta là tín hiệu độc lập.** Luôn kết hợp với cấu trúc và một công cụ context (VWAP, profile, vùng giá then chốt).
2. **Bỏ qua khung giờ.** Delta lúc mở cửa có signal/noise khác hẳn lúc giữa phiên.
3. **Bỏ qua footprint khung lớn hơn.** Phân kỳ 1-phút trong xu hướng khung lớn ngược chiều thường không trade được riêng lẻ.

## Đọc tiếp gì

Nếu bạn thấy bài này hữu ích, module [TPO & Profile](/academy/tpo-profile) đi rất ăn ý với việc đọc order flow — profile cho bạn biết *ở đâu*, footprint cho bạn biết *ai*.
`;

const TAGS: Array<{
  slug: string;
  isTrending: boolean;
  en: string;
  vi: string;
}> = [
  { slug: "delta", isTrending: true, en: "DELTA", vi: "DELTA" },
  { slug: "vwap", isTrending: true, en: "VWAP", vi: "VWAP" },
  { slug: "liquidity", isTrending: true, en: "LIQUIDITY", vi: "THANH KHOẢN" },
];

async function seedTags() {
  for (const t of TAGS) {
    const tag = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { isTrending: t.isTrending },
      create: { slug: t.slug, isTrending: t.isTrending },
    });
    await prisma.tagTranslation.upsert({
      where: { tagId_locale: { tagId: tag.id, locale: "en" } },
      update: { name: t.en },
      create: { tagId: tag.id, locale: "en", name: t.en },
    });
    await prisma.tagTranslation.upsert({
      where: { tagId_locale: { tagId: tag.id, locale: "vi" } },
      update: { name: t.vi },
      create: { tagId: tag.id, locale: "vi", name: t.vi },
    });
  }
  console.log(`✓ ${TAGS.length} trending tags upserted`);
}

async function seedDemoArticle() {
  const mod = await prisma.module.findUnique({
    where: { slug: "order-flow-footprints" },
  });
  if (!mod) {
    console.error(
      "✗ Module 'order-flow-footprints' missing — run `pnpm db:seed` first.",
    );
    return;
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("✗ No admin user — run `pnpm db:seed` first.");
    return;
  }

  // Use a stable external slug so re-runs idempotently match. We anchor
  // on the (locale, slug) unique index for translations.
  const enSlug = "delta-explained";
  const viSlug = "delta-la-gi";

  // Find existing English translation by (locale, slug) to locate the article.
  const existing = await prisma.articleTranslation.findUnique({
    where: { locale_slug: { locale: "en", slug: enSlug } },
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
        publishedAt: existing.article.publishedAt ?? now,
        difficulty: "INTERMEDIATE",
        likeCount: 154,
      },
    });
  } else {
    const created = await prisma.article.create({
      data: {
        moduleId: mod.id,
        authorId: admin.id,
        status: "PUBLISHED",
        sourceLocale: "en",
        publishedAt: now,
        difficulty: "INTERMEDIATE",
        likeCount: 154,
      },
    });
    articleId = created.id;
  }

  // EN translation
  await prisma.articleTranslation.upsert({
    where: { articleId_locale: { articleId, locale: "en" } },
    update: {
      slug: enSlug,
      title: "Delta explained: reading aggressive flow",
      excerpt:
        "What delta really measures, three patterns that matter, and the mistakes that drain a footprint trader's edge.",
      bodyMdx: ENGLISH_BODY,
      metaTitle:
        "Delta explained — reading aggressive flow | Kiyotaka Academy",
      metaDescription:
        "Delta is aggressive buy volume minus aggressive sell volume. Learn to read divergence, absorption, and confirmation patterns.",
      status: "PUBLISHED",
      publishedAt: now,
      basedOnSourceVersion: 1,
    },
    create: {
      articleId,
      locale: "en",
      slug: enSlug,
      title: "Delta explained: reading aggressive flow",
      excerpt:
        "What delta really measures, three patterns that matter, and the mistakes that drain a footprint trader's edge.",
      bodyMdx: ENGLISH_BODY,
      metaTitle:
        "Delta explained — reading aggressive flow | Kiyotaka Academy",
      metaDescription:
        "Delta is aggressive buy volume minus aggressive sell volume. Learn to read divergence, absorption, and confirmation patterns.",
      status: "PUBLISHED",
      publishedAt: now,
      basedOnSourceVersion: 1,
    },
  });

  // VI translation
  await prisma.articleTranslation.upsert({
    where: { articleId_locale: { articleId, locale: "vi" } },
    update: {
      slug: viSlug,
      title: "Delta là gì: đọc dòng lệnh chủ động",
      excerpt:
        "Delta thực ra đo gì, ba pattern quan trọng, và những lỗi làm cùn cạnh footprint trader.",
      bodyMdx: VIETNAMESE_BODY,
      metaTitle: "Delta là gì — đọc dòng lệnh chủ động | Học viện Kiyotaka",
      metaDescription:
        "Delta = khối lượng mua chủ động trừ bán chủ động. Đọc phân kỳ, hấp thụ và xác nhận trên footprint.",
      status: "PUBLISHED",
      publishedAt: now,
      basedOnSourceVersion: 1,
    },
    create: {
      articleId,
      locale: "vi",
      slug: viSlug,
      title: "Delta là gì: đọc dòng lệnh chủ động",
      excerpt:
        "Delta thực ra đo gì, ba pattern quan trọng, và những lỗi làm cùn cạnh footprint trader.",
      bodyMdx: VIETNAMESE_BODY,
      metaTitle: "Delta là gì — đọc dòng lệnh chủ động | Học viện Kiyotaka",
      metaDescription:
        "Delta = khối lượng mua chủ động trừ bán chủ động. Đọc phân kỳ, hấp thụ và xác nhận trên footprint.",
      status: "PUBLISHED",
      publishedAt: now,
      basedOnSourceVersion: 1,
    },
  });

  // Tag the article with `delta` and `liquidity`.
  for (const tagSlug of ["delta", "liquidity"]) {
    const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
    if (!tag) continue;
    await prisma.articleTag.upsert({
      where: { articleId_tagId: { articleId, tagId: tag.id } },
      update: {},
      create: { articleId, tagId: tag.id },
    });
  }

  console.log("✓ Demo article seeded (EN: delta-explained, VI: delta-la-gi)");
}

async function main() {
  console.log("→ Seeding demo content…\n");
  await seedTags();
  await seedDemoArticle();
  console.log("\nDone.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

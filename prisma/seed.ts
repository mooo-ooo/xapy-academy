/**
 * Seed script — run with: pnpm db:seed
 *
 * Idempotent: re-running won't duplicate the admin user, modules, or
 * SiteSetting row. Translations are upserted per locale.
 *
 * Admin password is generated only the first time and printed to stdout
 * — save it. Subsequent runs leave the existing admin untouched.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@academy.local";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Site Admin";

const SUPPORTED_LOCALES = ["en", "vi"] as const;

type ModuleSeed = {
  slug: string;
  icon: string;
  sortOrder: number;
  translations: Array<{
    locale: (typeof SUPPORTED_LOCALES)[number];
    name: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
  }>;
};

const MODULES: ModuleSeed[] = [
  {
    slug: "order-flow-footprints",
    icon: "Activity",
    sortOrder: 10,
    translations: [
      {
        locale: "en",
        name: "Order Flow Footprints",
        description:
          "Read aggressive buyers and sellers in real time using footprint charts, bid-ask imbalance, and delta.",
        metaTitle: "Order Flow Footprints — Kiyotaka Academy",
        metaDescription:
          "Footprint charts, delta and imbalance — read aggressive buyers and sellers in real time.",
      },
      {
        locale: "vi",
        name: "Footprint Order Flow",
        description:
          "Đọc lực mua bán chủ động theo thời gian thực qua footprint chart, mất cân bằng bid-ask và delta.",
        metaTitle: "Footprint Order Flow — Học viện Kiyotaka",
        metaDescription:
          "Footprint chart, delta và imbalance — đọc lực mua bán chủ động theo thời gian thực.",
      },
    ],
  },
  {
    slug: "tpo-profile",
    icon: "BarChart3",
    sortOrder: 20,
    translations: [
      {
        locale: "en",
        name: "TPO & Profile",
        description:
          "Time-Price Opportunity, market profile and value-area mechanics for context-driven decisions.",
        metaTitle: "TPO & Market Profile — Kiyotaka Academy",
        metaDescription:
          "Time-Price Opportunity and market profile mechanics for context-driven trade location.",
      },
      {
        locale: "vi",
        name: "TPO & Profile",
        description:
          "Time-Price Opportunity, market profile và value-area — đọc bối cảnh phiên giao dịch.",
        metaTitle: "TPO & Market Profile — Học viện Kiyotaka",
        metaDescription:
          "Time-Price Opportunity và market profile để đọc bối cảnh và chọn điểm vào lệnh.",
      },
    ],
  },
  {
    slug: "technical-analysis",
    icon: "LineChart",
    sortOrder: 30,
    translations: [
      {
        locale: "en",
        name: "Technical Analysis",
        description:
          "Trends, structure, levels and indicators — the modern technician's toolkit.",
        metaTitle: "Technical Analysis — Kiyotaka Academy",
        metaDescription:
          "Trends, market structure, key levels and indicator playbooks for modern technicians.",
      },
      {
        locale: "vi",
        name: "Phân tích kỹ thuật",
        description:
          "Xu hướng, cấu trúc thị trường, vùng giá quan trọng và indicator — bộ công cụ phân tích kỹ thuật hiện đại.",
        metaTitle: "Phân tích kỹ thuật — Học viện Kiyotaka",
        metaDescription:
          "Xu hướng, cấu trúc, vùng giá và indicator — bộ công cụ phân tích kỹ thuật cập nhật.",
      },
    ],
  },
  {
    slug: "psychology",
    icon: "Brain",
    sortOrder: 40,
    translations: [
      {
        locale: "en",
        name: "Psychology",
        description:
          "Risk discipline, emotional control and the cognitive frameworks used by institutional traders.",
        metaTitle: "Trading Psychology — Kiyotaka Academy",
        metaDescription:
          "Risk discipline, emotional control and cognitive frameworks used by institutional traders.",
      },
      {
        locale: "vi",
        name: "Tâm lý giao dịch",
        description:
          "Kỷ luật rủi ro, kiểm soát cảm xúc và những framework tư duy mà trader chuyên nghiệp áp dụng.",
        metaTitle: "Tâm lý giao dịch — Học viện Kiyotaka",
        metaDescription:
          "Kỷ luật rủi ro, kiểm soát cảm xúc và framework tư duy của trader chuyên nghiệp.",
      },
    ],
  },
];

function generatePassword() {
  // 16-char URL-safe random, easy to copy from terminal
  return randomBytes(12).toString("base64url");
}

async function seedSiteSettings() {
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      supportedLocales: [...SUPPORTED_LOCALES],
    },
    create: {
      id: 1,
      publicLocale: "en",
      supportedLocales: [...SUPPORTED_LOCALES],
      siteName: "Kiyotaka Academy",
    },
  });
  console.log("✓ SiteSetting upserted");
}

async function seedAdmin(): Promise<{ created: boolean; password?: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (existing) {
    console.log(`✓ Admin already exists: ${ADMIN_EMAIL} (skipping)`);
    return { created: false };
  }
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
      preferredLang: "vi",
      isActive: true,
    },
  });
  console.log("✓ Admin user created");
  return { created: true, password };
}

async function seedModules() {
  for (const m of MODULES) {
    const mod = await prisma.module.upsert({
      where: { slug: m.slug },
      update: { icon: m.icon, sortOrder: m.sortOrder, isPublic: true },
      create: {
        slug: m.slug,
        icon: m.icon,
        sortOrder: m.sortOrder,
        isPublic: true,
      },
    });
    for (const tr of m.translations) {
      await prisma.moduleTranslation.upsert({
        where: { moduleId_locale: { moduleId: mod.id, locale: tr.locale } },
        update: {
          name: tr.name,
          description: tr.description,
          metaTitle: tr.metaTitle,
          metaDescription: tr.metaDescription,
        },
        create: {
          moduleId: mod.id,
          locale: tr.locale,
          name: tr.name,
          description: tr.description,
          metaTitle: tr.metaTitle,
          metaDescription: tr.metaDescription,
        },
      });
    }
  }
  console.log(`✓ ${MODULES.length} modules upserted with translations`);
}

async function main() {
  console.log("→ Seeding…\n");
  await seedSiteSettings();
  const admin = await seedAdmin();
  await seedModules();

  console.log("\n----------------------------------------------------");
  if (admin.created && admin.password) {
    console.log(`Admin credentials (save now — printed ONCE):`);
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${admin.password}`);
  } else {
    console.log(`Admin: ${ADMIN_EMAIL} (existing — password unchanged)`);
  }
  console.log("----------------------------------------------------\n");
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

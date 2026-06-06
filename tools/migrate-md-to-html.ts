import { readFileSync } from "node:fs";
import { join } from "node:path";

try {
  const env = readFileSync(join(process.cwd(), ".env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
} catch {
  void 0;
}

import { PrismaClient } from "@prisma/client";
import { markdownToHtml } from "../src/lib/content";

async function main() {
  const prisma = new PrismaClient();
  const force = process.argv.includes("--force");
  const rows = await prisma.articleTranslation.findMany({
    select: { id: true, bodyMdx: true, bodyHtml: true, slug: true },
  });
  let migrated = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!force && r.bodyHtml && r.bodyHtml.trim()) {
      skipped++;
      continue;
    }
    const html = markdownToHtml(r.bodyMdx);
    await prisma.articleTranslation.update({
      where: { id: r.id },
      data: { bodyHtml: html },
    });
    migrated++;
    console.log(`  ✓ ${r.slug}`);
  }
  console.log(
    `\nDone. Migrated ${migrated}, skipped ${skipped} (already had HTML). Total ${rows.length}.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

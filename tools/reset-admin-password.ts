/**
 * One-off: reset the admin@academy.local password.
 * Run with: pnpm tsx tools/reset-admin-password.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();
const EMAIL = process.argv[2] ?? "admin@academy.local";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`User not found: ${EMAIL}`);
    process.exit(1);
  }
  const password = randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash, isActive: true },
  });
  console.log("----------------------------------------------------");
  console.log(`Reset OK — save this password now (printed ONCE):`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${password}`);
  console.log("----------------------------------------------------");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

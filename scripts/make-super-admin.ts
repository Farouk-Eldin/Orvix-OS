/**
 * One-time bootstrap for production: there's no self-serve way to become
 * a super admin (correctly — /admin should not be reachable by anyone who
 * hasn't been deliberately promoted). Run once after your own account
 * exists:
 *
 *   npx tsx scripts/make-super-admin.ts you@yourcompany.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-super-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { isSuperAdmin: true },
  });

  console.log(`✅ ${user.email} is now a super admin — /admin is reachable for this account.`);
}

main()
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

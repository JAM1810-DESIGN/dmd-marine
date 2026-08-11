// Creates (or resets) a production ADMIN user from environment variables —
// no default/known password, unlike the dev seed. Run against the target DB:
//   DATABASE_URL="<prod url>" ADMIN_EMAIL="you@company.com" ADMIN_PASSWORD="<strong>" pnpm create-admin
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (ADMIN_NAME optional).");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const passwordHash = await hashPassword(password);
    const user = await db.user.upsert({
      where: { email },
      update: { role: "ADMIN", isActive: true, passwordHash },
      create: { name, email, passwordHash, role: "ADMIN" },
    });
    console.log(`Admin ready: ${user.email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to create admin:", error instanceof Error ? error.message : error);
  process.exit(1);
});

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security/password";

// Bootstrap of the single owner/admin account. Roles are never selectable at registration,
// so this is the only path to ADMIN.
async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const name = process.env.OWNER_NAME?.trim();
  const username = process.env.OWNER_USERNAME?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;

  if (!email || !name || !username || !password) {
    console.error(
      "Seed aborted: OWNER_EMAIL, OWNER_NAME, OWNER_USERNAME and OWNER_PASSWORD must all be set.\n" +
        "Set them once for bootstrap, then remove them from the environment file.",
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error("Seed aborted: OWNER_PASSWORD must be at least 12 characters.");
    process.exitCode = 1;
    return;
  }

  const db = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);

    const owner = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        username,
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(),
        profile: { create: {} },
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`Owner account ready: ${owner.email} (${owner.role})`);
    console.log("Remove the OWNER_* variables from .env now that the account exists.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});

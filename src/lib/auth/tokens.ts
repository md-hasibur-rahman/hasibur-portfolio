import { db } from "@/lib/db/client";
import { hashToken, randomToken } from "@/lib/security/crypto";
import { AppError } from "@/lib/errors";
import type { AuthTokenPurpose } from "@prisma/client";

const TTL: Record<AuthTokenPurpose, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 30 * 60 * 1000,
};

// Returns the raw token exactly once; the database only ever stores its SHA-256 hash.
export async function issueToken(input: {
  userId: string;
  purpose: AuthTokenPurpose;
}): Promise<string> {
  const raw = randomToken();
  await db.authToken.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TTL[input.purpose]),
    },
  });
  return raw;
}

export async function consumeToken(input: {
  raw: string;
  purpose: AuthTokenPurpose;
}): Promise<{ userId: string }> {
  const record = await db.authToken.findUnique({ where: { tokenHash: hashToken(input.raw) } });

  if (!record || record.purpose !== input.purpose || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("NOT_FOUND");
  }

  await db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { userId: record.userId };
}

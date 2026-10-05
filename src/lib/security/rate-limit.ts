import { db } from "@/lib/db/client";
import { rateLimited } from "@/lib/errors";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_PER_EMAIL = 5;
const MAX_FAILED_PER_IP = 25;

export async function assertLoginAllowed(input: {
  email: string;
  ipAddress: string | null;
}): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({
      where: { email: input.email, succeeded: false, createdAt: { gt: since } },
    }),
    input.ipAddress
      ? db.loginAttempt.count({
          where: { ipAddress: input.ipAddress, succeeded: false, createdAt: { gt: since } },
        })
      : Promise.resolve(0),
  ]);

  if (byEmail >= MAX_FAILED_PER_EMAIL || byIp >= MAX_FAILED_PER_IP) throw rateLimited();
}

export async function recordLoginAttempt(input: {
  email: string;
  ipAddress: string | null;
  succeeded: boolean;
}): Promise<void> {
  await db.loginAttempt.create({
    data: {
      email: input.email,
      ipAddress: input.ipAddress,
      succeeded: input.succeeded,
    },
  });
}

// Sliding-window cap for user-generated content (e.g. messaging), keyed by userId.
export async function assertRateBudget(input: {
  userId: string;
  action: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const since = new Date(Date.now() - input.windowMs);
  const count = await db.auditLog.count({
    where: { userId: input.userId, action: input.action, createdAt: { gt: since } },
  });
  if (count >= input.limit) throw rateLimited();
}

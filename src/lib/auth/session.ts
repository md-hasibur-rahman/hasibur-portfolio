import { db } from "@/lib/db/client";
import type { AuthMethod } from "@prisma/client";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
// Sensitive reads (vault, API credentials) demand authentication this fresh.
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export type RequestMeta = { ipAddress: string | null; userAgent: string | null };

export async function createDbSession(
  input: { userId: string; method?: AuthMethod },
  meta: RequestMeta,
): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const session = await db.session.create({
    data: {
      userId: input.userId,
      expiresAt,
      authenticatedAt: new Date(),
      method: input.method ?? "PASSWORD",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
    select: { id: true, expiresAt: true },
  });

  return session;
}

// Returns the row only when it is still valid; the caller decides what "invalid" means.
export async function findActiveSession(sessionId: string) {
  const session = await db.session.findFirst({
    where: { id: sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!session) return null;

  // Throttle the write: lastUsedAt only needs minute-level accuracy for a sessions list.
  if (Date.now() - session.lastUsedAt.getTime() > 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  }

  return session;
}

export async function resolveSessionForUser(userId: string, sessionId: string) {
  const dbSession = await findActiveSession(sessionId);
  if (!dbSession || dbSession.userId !== userId) return null;
  if (dbSession.user.blockedAt) return null;
  return dbSession;
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeOtherSessions(currentSessionId: string, userId: string): Promise<number> {
  const result = await db.session.updateMany({
    where: { userId, revokedAt: null, id: { not: currentSessionId } },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export function isAuthenticatedRecently(authenticatedAt: Date, now = Date.now()): boolean {
  return now - authenticatedAt.getTime() <= REAUTH_WINDOW_MS;
}

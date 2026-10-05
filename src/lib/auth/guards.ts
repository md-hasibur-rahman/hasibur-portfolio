import { cache } from "react";
import { forbidden, reauthRequired, unauthorized } from "@/lib/errors";
import { auth } from "@/lib/auth/config";
import { canAccessRole } from "@/lib/auth/roles";
import { isAuthenticatedRecently, resolveSessionForUser } from "@/lib/auth/session";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: Role;
  avatarUrl: string | null;
  emailVerified: boolean;
  sessionId: string;
  sessionAuthenticatedAt: Date;
};

// Resolves the cookie into a database-verified user.
// The JWT alone is never trusted for authorization: the Session row must exist, be unrevoked,
// and be unexpired, which is what makes "log out all other devices" actually work.
export const authenticateUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = session?.user?.sessionId;
  if (!userId || !sessionId) return null;

  const dbSession = await resolveSessionForUser(userId, sessionId);
  if (!dbSession) return null;

  return {
    id: dbSession.user.id,
    email: dbSession.user.email,
    name: dbSession.user.name,
    username: dbSession.user.username,
    role: dbSession.user.role,
    avatarUrl: dbSession.user.avatarUrl,
    emailVerified: Boolean(dbSession.user.emailVerified),
    sessionId: dbSession.id,
    sessionAuthenticatedAt: dbSession.authenticatedAt,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await authenticateUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!canAccessRole(user.role, role)) throw forbidden();
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}

// Vault and API-credential reads re-check the role server-side *and* require a recent login,
// so a stolen long-lived cookie cannot open the vault without the password again.
export async function requireVaultAccess(): Promise<CurrentUser> {
  const user = await requireAdmin();
  if (!isAuthenticatedRecently(user.sessionAuthenticatedAt)) throw reauthRequired();
  return user;
}

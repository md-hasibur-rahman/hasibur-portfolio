import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  createDbSession,
  findActiveSession,
  resolveSessionForUser,
  revokeOtherSessions,
  revokeSession,
} from "@/lib/auth/session";
import { assertLoginAllowed, recordLoginAttempt } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import { issueToken, consumeToken } from "@/lib/auth/tokens";

// Opt-in: a placeholder DATABASE_URL should not make the default test run hit a dead host.
// Run with: RUN_DB_INTEGRATION=1 npm test
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);
let passwordHash = "";

const meta = { ipAddress: "203.0.113.10", userAgent: "vitest" };

let userIdA = "";
let userIdB = "";

beforeAll(async () => {
  if (!enabled) return;
  passwordHash = await hashPassword("Integration-Pass-123");
  const a = await db.user.create({
    data: {
      email: `a-${suffix}@example.test`,
      name: "User A",
      username: `usera${suffix}`,
      passwordHash,
      role: "USER",
    },
    select: { id: true },
  });
  const b = await db.user.create({
    data: {
      email: `b-${suffix}@example.test`,
      name: "Admin B",
      username: `adminb${suffix}`,
      passwordHash,
      role: "ADMIN",
    },
    select: { id: true },
  });
  userIdA = a.id;
  userIdB = b.id;
});

afterAll(async () => {
  if (!enabled) return;
  await db.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
  await db.loginAttempt.deleteMany({ where: { ipAddress: meta.ipAddress } });
  await db.auditLog.deleteMany({ where: { userAgent: meta.userAgent } });
  await db.$disconnect();
});

suite("session verification", () => {
  it("resolves a session only for its own user", async () => {
    const session = await createDbSession({ userId: userIdA }, meta);

    expect(await resolveSessionForUser(userIdA, session.id)).not.toBeNull();
    // Presenting another account's session id must not resolve.
    expect(await resolveSessionForUser(userIdB, session.id)).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const session = await createDbSession({ userId: userIdA }, meta);
    await revokeSession(session.id, userIdA);
    expect(await findActiveSession(session.id)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const session = await createDbSession({ userId: userIdA }, meta);
    await db.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await findActiveSession(session.id)).toBeNull();
  });

  it("rejects a blocked user", async () => {
    const session = await createDbSession({ userId: userIdA }, meta);
    await db.user.update({ where: { id: userIdA }, data: { blockedAt: new Date() } });
    expect(await resolveSessionForUser(userIdA, session.id)).toBeNull();
    await db.user.update({ where: { id: userIdA }, data: { blockedAt: null } });
  });

  it("revokes every session except the current one", async () => {
    const keep = await createDbSession({ userId: userIdA }, meta);
    const other = await createDbSession({ userId: userIdA }, meta);

    const count = await revokeOtherSessions(keep.id, userIdA);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(await findActiveSession(keep.id)).not.toBeNull();
    expect(await findActiveSession(other.id)).toBeNull();
  });
});

suite("login throttling", () => {
  it("blocks further attempts after the failed-attempt budget", async () => {
    const email = `throttle-${suffix}@example.test`;
    for (let i = 0; i < 5; i += 1) {
      await recordLoginAttempt({ email, ipAddress: meta.ipAddress, succeeded: false });
    }
    await expect(assertLoginAllowed({ email, ipAddress: meta.ipAddress })).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("allows attempts for a different email under the same IP budget", async () => {
    await expect(
      assertLoginAllowed({ email: `fresh-${suffix}@example.test`, ipAddress: "203.0.113.99" }),
    ).resolves.toBeUndefined();
  });
});

suite("one-time tokens", () => {
  it("consumes a token exactly once", async () => {
    const raw = await issueToken({ userId: userIdA, purpose: "PASSWORD_RESET" });
    expect((await consumeToken({ raw, purpose: "PASSWORD_RESET" })).userId).toBe(userIdA);
    await expect(consumeToken({ raw, purpose: "PASSWORD_RESET" })).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a token used for the wrong purpose", async () => {
    const raw = await issueToken({ userId: userIdA, purpose: "EMAIL_VERIFICATION" });
    await expect(consumeToken({ raw, purpose: "PASSWORD_RESET" })).rejects.toBeInstanceOf(AppError);
  });
});

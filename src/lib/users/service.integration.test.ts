import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import { listUsers, setUserBlocked } from "@/lib/users/service";

// Opt-in: run with RUN_DB_INTEGRATION=1 npm test
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);

let adminId = "";
let userId = "";

async function makeUser(role: "USER" | "ADMIN", tag: string) {
  const user = await db.user.create({
    data: {
      email: `${tag}-${suffix}@example.test`,
      name: `Suite ${tag}`,
      username: `${tag}${suffix}`,
      passwordHash: await hashPassword("Integration-Users-123"),
      role,
    },
    select: { id: true },
  });
  return user.id;
}

async function expectAppError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error("Expected an AppError to be thrown");
}

beforeAll(async () => {
  if (!enabled) return;
  adminId = await makeUser("ADMIN", "manager");
  userId = await makeUser("USER", "member");
});

afterAll(async () => {
  if (!enabled) return;
  await db.auditLog.deleteMany({ where: { userId: { in: [adminId, userId] } } });
  await db.user.deleteMany({ where: { id: { in: [adminId, userId] } } });
});

suite("user administration", () => {
  it("finds a user by partial email and reports the blocked count", async () => {
    const [rows, total] = await listUsers({ search: `member-${suffix}` });
    expect(total).toBe(1);
    expect(rows[0]?.id).toBe(userId);
    expect(rows[0]?.blockedAt).toBeNull();
  });

  it("blocks and unblocks a member", async () => {
    const blocked = await setUserBlocked(adminId, { userId, blocked: true });
    expect(blocked.blockedAt).not.toBeNull();

    const restored = await setUserBlocked(adminId, { userId, blocked: false });
    expect(restored.blockedAt).toBeNull();

    const actions = await db.auditLog.findMany({
      where: { resourceId: userId, action: { in: ["user.block", "user.unblock"] } },
      select: { action: true },
    });
    expect(actions.map((row) => row.action).sort()).toEqual(["user.block", "user.unblock"]);
  });

  it("refuses to block the signed-in admin themselves", async () => {
    const error = await expectAppError(setUserBlocked(adminId, { userId: adminId, blocked: true }));
    expect(error.code).toBe("FORBIDDEN");
    expect(await db.user.findUniqueOrThrow({ where: { id: adminId } })).toMatchObject({ blockedAt: null });
  });

  it("refuses to block another admin from this screen", async () => {
    const otherAdmin = await makeUser("ADMIN", "peer");
    try {
      const error = await expectAppError(setUserBlocked(adminId, { userId: otherAdmin, blocked: true }));
      expect(error.code).toBe("VALIDATION");
      expect(error.details?.fields).toMatchObject({ userId: expect.arrayContaining([expect.stringContaining("admin")]) });
    } finally {
      await db.user.deleteMany({ where: { id: otherAdmin } });
    }
  });

  it("reports not found for an unknown user id", async () => {
    const error = await expectAppError(setUserBlocked(adminId, { userId: "cxxxxxxxxxxxxxxxxxxxxxxx", blocked: true }));
    expect(error.code).toBe("NOT_FOUND");
  });
});

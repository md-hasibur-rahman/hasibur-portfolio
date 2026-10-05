import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import { getProfile, updateProfile } from "@/lib/profile/service";

// Opt-in: run with RUN_DB_INTEGRATION=1 npm test
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);
let userId = "";

beforeAll(async () => {
  if (!enabled) return;
  const user = await db.user.create({
    data: {
      email: `profile-${suffix}@example.test`,
      name: "Profile Subject",
      username: `profile${suffix}`,
      passwordHash: await hashPassword("Integration-Profile-123"),
      role: "USER",
    },
    select: { id: true },
  });
  userId = user.id;
});

afterAll(async () => {
  if (!enabled) return;
  await db.auditLog.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
});

suite("profile settings", () => {
  it("creates the profile row on the first save", async () => {
    expect(await getProfile(userId)).toBeNull();

    await updateProfile(userId, {
      bio: "Builds the tools he uses.",
      location: "Dhaka, BD",
      githubUrl: "https://github.com/hasibur",
      linkedinUrl: "",
    });

    const stored = await getProfile(userId);
    expect(stored).toMatchObject({
      bio: "Builds the tools he uses.",
      location: "Dhaka, BD",
      githubUrl: "https://github.com/hasibur",
    });
    expect(stored?.linkedinUrl).toBeNull();
  });

  it("overwrites earlier values instead of appending", async () => {
    await updateProfile(userId, { bio: "First bio.", location: "Dhaka" });
    await updateProfile(userId, { bio: "Second bio.", location: "Remote" });

    const stored = await getProfile(userId);
    expect(stored?.bio).toBe("Second bio.");
    expect(stored?.location).toBe("Remote");
    expect(await db.profile.count({ where: { userId } })).toBe(1);
  });

  it("rejects a non-URL value before writing", async () => {
    try {
      await updateProfile(userId, { website: "not a url" });
      throw new Error("Expected an AppError");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).details?.fields).toHaveProperty("website");
    }
    expect((await getProfile(userId))?.website).toBeNull();
  });

  it("logs the change for the audit viewer", async () => {
    await updateProfile(userId, { location: "Dhaka" });
    expect(
      await db.auditLog.count({ where: { action: "profile.update", userId, resourceId: userId } }),
    ).toBeGreaterThan(0);
  });
});

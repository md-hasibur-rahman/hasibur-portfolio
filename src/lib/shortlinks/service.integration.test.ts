import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import {
  createShortLink,
  deleteShortLink,
  listShortLinks,
  registerShortLinkClick,
  resolveShortLink,
  unlockShortLink,
  updateShortLink,
} from "@/lib/shortlinks/service";

// Opt-in: run with npm run test:integration
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);
let adminId = "";
const linkIds: string[] = [];
const throttleKeys: string[] = [];

async function expectAppError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error("Expected an AppError to be thrown");
}

function slugFor(name: string) {
  return `t-${suffix}-${name}`;
}

beforeAll(async () => {
  if (!enabled) return;
  const admin = await db.user.create({
    data: {
      email: `shortlink-${suffix}@example.test`,
      name: "Short Link Admin",
      username: `shortlink${suffix}`,
      passwordHash: await hashPassword("Integration-Short-123"),
      role: "ADMIN",
    },
    select: { id: true },
  });
  adminId = admin.id;
});

afterAll(async () => {
  if (!enabled) return;
  await db.shortLink.deleteMany({ where: { id: { in: linkIds } } });
  await db.auditLog.deleteMany({ where: { resourceId: { in: linkIds } } });
  await db.auditLog.deleteMany({ where: { userId: adminId } });
  await db.loginAttempt.deleteMany({ where: { email: { in: throttleKeys } } });
  await db.user.deleteMany({ where: { id: adminId } });
});

suite("short links service", () => {
  it("creates a link with an explicit slug and no password", async () => {
    const link = await createShortLink(adminId, {
      targetUrl: "https://example.com/landing",
      slug: slugFor("plain"),
      title: "Launch page",
    });
    linkIds.push(link.id);

    expect(link.slug).toBe(slugFor("plain"));
    expect(link.hasPassword).toBe(false);
    expect(link.clicks).toBe(0);
    expect("passwordHash" in link).toBe(false);
  });

  it("generates a random slug when none is given", async () => {
    const link = await createShortLink(adminId, { targetUrl: "https://example.com/x" });
    linkIds.push(link.id);
    expect(link.slug).toMatch(/^[a-z0-9]{12}$/);
  });

  it("refuses a duplicate slug", async () => {
    const error = await expectAppError(
      createShortLink(adminId, { targetUrl: "https://example.com/y", slug: slugFor("plain") }),
    );
    expect(error.code).toBe("VALIDATION");
    expect(error.details?.fields).toMatchObject({ slug: [expect.stringContaining("already in use")] });
  });

  it("resolves a public slug and counts clicks", async () => {
    const link = await createShortLink(adminId, {
      targetUrl: "https://example.com/counted",
      slug: slugFor("count"),
    });
    linkIds.push(link.id);

    const resolved = await resolveShortLink(slugFor("count"));
    expect(resolved).toMatchObject({
      id: link.id,
      targetUrl: "https://example.com/counted",
      requiresPassword: false,
    });

    await registerShortLinkClick(link.id);
    await registerShortLinkClick(link.id);
    const row = await db.shortLink.findUnique({ where: { id: link.id }, select: { clicks: true } });
    expect(row?.clicks).toBe(2);

    expect(await resolveShortLink("no-such-slug-" + suffix)).toBeNull();
    expect(await resolveShortLink(undefined)).toBeNull();
    expect(await resolveShortLink("UPPER CASE")).toBeNull();
  });

  it("keeps the password hash out of summaries and flags protection", async () => {
    const link = await createShortLink(adminId, {
      targetUrl: "https://example.com/secret",
      slug: slugFor("secret"),
      password: "correct-horse-battery",
    });
    linkIds.push(link.id);

    expect(link.hasPassword).toBe(true);
    const rows = await listShortLinks();
    const row = rows.find((entry) => entry.id === link.id);
    expect(row && "passwordHash" in row).toBe(false);
    expect(row?.hasPassword).toBe(true);
  });

  it("verifies the unlock password, counts the click and throttles brute force", async () => {
    const slug = slugFor("unlock");
    throttleKeys.push(`shortlink:${slug}`);
    const link = await createShortLink(adminId, {
      targetUrl: "https://example.com/unlocked",
      slug,
      password: "open-sesame-please",
    });
    linkIds.push(link.id);

    const wrong = await expectAppError(unlockShortLink({ slug, password: "wrong-password" }));
    expect(wrong.code).toBe("VALIDATION");
    expect(wrong.details?.fields).toMatchObject({ password: [expect.stringContaining("does not match")] });

    const ok = await unlockShortLink({ slug, password: "open-sesame-please" });
    expect(ok.targetUrl).toBe("https://example.com/unlocked");
    const afterUnlock = await db.shortLink.findUnique({ where: { id: link.id }, select: { clicks: true } });
    expect(afterUnlock?.clicks).toBe(1);

    // Five failures in the window: the sixth attempt is refused before the hash is even checked.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expectAppError(unlockShortLink({ slug, password: "wrong-password" }));
    }
    const limited = await expectAppError(unlockShortLink({ slug, password: "open-sesame-please" }));
    expect(limited.code).toBe("RATE_LIMITED");
  }, 30_000);

  it("updates target, slug, title and password with keep/set/remove semantics", async () => {
    const slug = slugFor("edit");
    const link = await createShortLink(adminId, {
      targetUrl: "https://example.com/before",
      slug,
      title: "Before",
      password: "first-password-1",
    });
    linkIds.push(link.id);

    // Keep: password field omitted.
    const kept = await updateShortLink(adminId, {
      id: link.id,
      targetUrl: "https://example.com/after",
      title: "After",
      slug: slugFor("edit-2"),
    });
    expect(kept.targetUrl).toBe("https://example.com/after");
    expect(kept.slug).toBe(slugFor("edit-2"));
    expect(kept.hasPassword).toBe(true);
    expect(await resolveShortLink(slug)).toBeNull();
    expect((await resolveShortLink(slugFor("edit-2")))?.requiresPassword).toBe(true);

    // Set: new password replaces the old one.
    const replaced = await updateShortLink(adminId, { id: link.id, password: "second-password-2" });
    expect(replaced.hasPassword).toBe(true);
    const withNew = await unlockShortLink({ slug: slugFor("edit-2"), password: "second-password-2" });
    throttleKeys.push(`shortlink:${slugFor("edit-2")}`);
    expect(withNew.targetUrl).toBe("https://example.com/after");

    // Remove: empty string clears the hash, title cleared to null.
    const removed = await updateShortLink(adminId, { id: link.id, password: "", title: "" });
    expect(removed.hasPassword).toBe(false);
    expect(removed.title).toBeNull();
    expect((await resolveShortLink(slugFor("edit-2")))?.requiresPassword).toBe(false);
  }, 30_000);

  it("refuses renaming onto an existing slug and deletes cleanly", async () => {
    const first = await createShortLink(adminId, {
      targetUrl: "https://example.com/one",
      slug: slugFor("one"),
    });
    const second = await createShortLink(adminId, {
      targetUrl: "https://example.com/two",
      slug: slugFor("two"),
    });
    linkIds.push(first.id, second.id);

    const error = await expectAppError(updateShortLink(adminId, { id: second.id, slug: slugFor("one") }));
    expect(error.code).toBe("VALIDATION");

    const deleted = await deleteShortLink(adminId, { id: second.id });
    expect(deleted.slug).toBe(slugFor("two"));
    expect(await resolveShortLink(slugFor("two"))).toBeNull();
    expect(await expectAppError(deleteShortLink(adminId, { id: second.id }))).toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects malformed ids and empty targets at the service edge", async () => {
    expect(await expectAppError(deleteShortLink(adminId, { id: "not-a-cuid" }))).toMatchObject({
      code: "VALIDATION",
    });
    const bad = await expectAppError(
      createShortLink(adminId, { targetUrl: "javascript:alert(1)", slug: slugFor("bad") }),
    );
    expect(bad.code).toBe("VALIDATION");
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import {
  createApiCredential,
  createVaultItem,
  deleteApiCredential,
  deleteVaultItem,
  listApiCredentials,
  listVaultCategories,
  listVaultItems,
  revealApiCredential,
  revealVaultItem,
  updateApiCredential,
  updateVaultItem,
  vaultConfigured,
} from "@/lib/vault/service";

// Opt-in: run with npm run test:integration. Needs the real VAULT_ENCRYPTION_KEY, because
// the whole point is proving the round-trip with the configured key.
const enabled =
  process.env.RUN_DB_INTEGRATION === "1" &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.VAULT_ENCRYPTION_KEY);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);
const category = `it-${suffix}`;
let adminId = "";
let otherId = "";
const vaultIds: string[] = [];
const credentialIds: string[] = [];

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
  const passwordHash = await hashPassword("Integration-Vault-123");
  const [admin, other] = await Promise.all([
    db.user.create({
      data: {
        email: `vault-${suffix}@example.test`,
        name: "Vault Admin",
        username: `vaultadmin${suffix}`,
        passwordHash,
        role: "ADMIN",
      },
      select: { id: true },
    }),
    db.user.create({
      data: {
        email: `vault-other-${suffix}@example.test`,
        name: "Vault Other",
        username: `vaultother${suffix}`,
        passwordHash,
        role: "USER",
      },
      select: { id: true },
    }),
  ]);
  adminId = admin.id;
  otherId = other.id;
});

afterAll(async () => {
  if (!enabled) return;
  await db.vaultItem.deleteMany({ where: { id: { in: vaultIds } } });
  await db.apiCredential.deleteMany({ where: { id: { in: credentialIds } } });
  await db.vaultItem.deleteMany({ where: { ownerId: { in: [adminId, otherId] } } });
  await db.apiCredential.deleteMany({ where: { ownerId: { in: [adminId, otherId] } } });
  await db.auditLog.deleteMany({ where: { userId: { in: [adminId, otherId] } } });
  await db.user.deleteMany({ where: { id: { in: [adminId, otherId] } } });
});

suite("vault service", () => {
  it("reports the encryption key as configured", () => {
    expect(vaultConfigured()).toBe(true);
  });

  it("stores secrets encrypted at rest and never returns ciphertext", async () => {
    const item = await createVaultItem(adminId, {
      title: "Neon production",
      username: "hasibur",
      password: "s3cret-pw",
      notes: "rotate every 90 days",
      url: "https://console.neon.tech",
      category,
    });
    vaultIds.push(item.id);

    expect(item.hasPassword).toBe(true);
    expect(item.hasNotes).toBe(true);
    expect("encryptedPassword" in item).toBe(false);
    expect("encryptedNotes" in item).toBe(false);

    const row = await db.vaultItem.findUnique({ where: { id: item.id } });
    expect(row?.encryptedPassword).not.toBeNull();
    expect(row?.encryptedPassword).not.toContain("s3cret-pw");
    expect(row?.encryptedNotes).not.toContain("rotate");
    expect(row?.encryptedPassword?.split(".")).toHaveLength(3);
  });

  it("lists metadata only, and filters by search and category", async () => {
    const list = await listVaultItems(adminId, { search: "Neon", category });
    const found = list.rows.find((row) => vaultIds.includes(row.id));
    expect(found).toBeTruthy();
    expect(found && "encryptedPassword" in found).toBe(false);
    expect(found && "encryptedNotes" in found).toBe(false);

    const miss = await listVaultItems(adminId, { search: `zz-no-match-${suffix}` });
    expect(miss.rows).toHaveLength(0);

    const categories = await listVaultCategories(adminId);
    expect(categories).toContain(category);
  });

  it("reveals one field at a time and rejects cross-domain fields", async () => {
    const id = vaultIds[0];
    const revealed = await revealVaultItem(adminId, { id, field: "password" });
    expect(revealed).toMatchObject({ id, field: "password", value: "s3cret-pw" });

    const notes = await revealVaultItem(adminId, { id, field: "notes" });
    expect(notes.value).toBe("rotate every 90 days");

    const crossDomain = await expectAppError(revealVaultItem(adminId, { id, field: "apiKey" }));
    expect(crossDomain.code).toBe("VALIDATION");
  });

  it("keeps stored secrets when update fields are blank, and replaces them when set", async () => {
    const id = vaultIds[0];
    const updated = await updateVaultItem(adminId, {
      id,
      title: "Neon (rotated)",
      username: "",
      password: "",
      notes: "",
      category,
    });
    expect(updated.title).toBe("Neon (rotated)");
    expect(updated.username).toBeNull();
    expect(updated.hasPassword).toBe(true);
    expect(updated.hasNotes).toBe(true);
    expect((await revealVaultItem(adminId, { id, field: "password" })).value).toBe("s3cret-pw");

    await updateVaultItem(adminId, {
      id,
      title: "Neon (rotated)",
      password: "new-pw-123",
      category,
    });
    expect((await revealVaultItem(adminId, { id, field: "password" })).value).toBe("new-pw-123");
  });

  it("scopes every operation to the owner", async () => {
    const id = vaultIds[0];
    expect(
      await expectAppError(revealVaultItem(otherId, { id, field: "password" })),
    ).toMatchObject({ code: "NOT_FOUND" });
    expect(
      await expectAppError(updateVaultItem(otherId, { id, title: "stolen", category })),
    ).toMatchObject({ code: "NOT_FOUND" });
    expect(await expectAppError(deleteVaultItem(otherId, { id }))).toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("validates at the service edge", async () => {
    expect(await expectAppError(createVaultItem(adminId, { title: "" }))).toMatchObject({
      code: "VALIDATION",
    });
    expect(
      await expectAppError(createVaultItem(adminId, { title: "Bad URL", url: "not-a-url" })),
    ).toMatchObject({ code: "VALIDATION" });
    const missing = await expectAppError(
      revealVaultItem(adminId, { id: "no-such-id", field: "password" }),
    );
    expect(missing.code).toBe("NOT_FOUND");
  });

  it("deletes cleanly and then reports not found", async () => {
    const item = await createVaultItem(adminId, { title: "Temporary", category });
    vaultIds.push(item.id);
    const deleted = await deleteVaultItem(adminId, { id: item.id });
    expect(deleted.id).toBe(item.id);
    expect(await expectAppError(deleteVaultItem(adminId, { id: item.id }))).toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("round-trips API credentials with encrypted key and secret", async () => {
    const credential = await createApiCredential(adminId, {
      name: `Render key ${suffix}`,
      service: "Render",
      apiKey: "rnd-key-abc",
      apiSecret: "rnd-secret-xyz",
      baseUrl: "https://api.render.com",
      notes: "deploy only",
    });
    credentialIds.push(credential.id);

    expect(credential.hasKey).toBe(true);
    expect(credential.hasSecret).toBe(true);
    expect("encryptedKey" in credential).toBe(false);
    expect("encryptedSecret" in credential).toBe(false);

    const row = await db.apiCredential.findUnique({ where: { id: credential.id } });
    expect(row?.encryptedKey).not.toContain("rnd-key-abc");
    expect(row?.encryptedSecret).not.toContain("rnd-secret-xyz");

    const list = await listApiCredentials(adminId, { search: `Render key ${suffix}` });
    expect(list.rows.find((entry) => entry.id === credential.id)?.hasKey).toBe(true);

    expect(
      (await revealApiCredential(adminId, { id: credential.id, field: "apiKey" })).value,
    ).toBe("rnd-key-abc");
    expect(
      (await revealApiCredential(adminId, { id: credential.id, field: "apiSecret" })).value,
    ).toBe("rnd-secret-xyz");

    const updated = await updateApiCredential(adminId, {
      id: credential.id,
      name: `Render key ${suffix} v2`,
      service: "Render",
      apiKey: "",
      apiSecret: "",
    });
    expect(updated.name).toBe(`Render key ${suffix} v2`);
    expect(updated.hasKey).toBe(true);
    expect(
      (await revealApiCredential(adminId, { id: credential.id, field: "apiKey" })).value,
    ).toBe("rnd-key-abc");

    expect(
      await expectAppError(revealApiCredential(otherId, { id: credential.id, field: "apiKey" })),
    ).toMatchObject({ code: "NOT_FOUND" });

    await deleteApiCredential(adminId, { id: credential.id });
    expect(
      await expectAppError(revealApiCredential(adminId, { id: credential.id, field: "apiKey" })),
    ).toMatchObject({ code: "NOT_FOUND" });
  });
});

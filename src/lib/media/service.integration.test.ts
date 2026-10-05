import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import { cloudinarySettings } from "@/lib/cloudinary/server";
import { issueUploadTicket, readUploadTicket } from "@/lib/media/pending";
import {
  deleteAsset,
  listAssets,
  prepareUpload,
  registerUploadedAsset,
  updateAssetAltText,
} from "@/lib/media/service";

// Opt-in: run with npm run test:integration
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;
const settings = cloudinarySettings();

const suffix = Date.now().toString(36);
let adminId = "";
const assetIds: string[] = [];
const projectIds: string[] = [];

async function expectAppError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error("Expected an AppError to be thrown");
}

async function makeAsset(publicId: string, overrides: Record<string, unknown> = {}) {
  const asset = await db.asset.create({
    data: {
      publicId,
      secureUrl: `https://res.cloudinary.com/demo/image/upload/${publicId}.png`,
      createdBy: adminId,
      ...overrides,
    },
    select: { id: true },
  });
  assetIds.push(asset.id);
  return asset.id;
}

beforeAll(async () => {
  if (!enabled) return;
  const admin = await db.user.create({
    data: {
      email: `media-${suffix}@example.test`,
      name: "Media Admin",
      username: `media${suffix}`,
      passwordHash: await hashPassword("Integration-Media-123"),
      role: "ADMIN",
    },
    select: { id: true },
  });
  adminId = admin.id;
});

afterAll(async () => {
  if (!enabled) return;
  await db.project.deleteMany({ where: { id: { in: projectIds } } });
  await db.asset.deleteMany({ where: { id: { in: assetIds } } });
  await db.auditLog.deleteMany({ where: { userId: adminId } });
  await db.user.deleteMany({ where: { id: adminId } });
});

suite("media library", () => {
  it.skipIf(!settings)("signs an upload for the public id it generated", async () => {
    const upload = await prepareUpload(adminId, {
      filename: "Studio Shot.PNG",
      size: 900_000,
      resourceType: "IMAGE",
    });

    expect(upload.endpoint).toContain("/image/upload");
    expect(upload.publicId).toMatch(/^[a-z0-9_-]+\/images\/\d{10}-studio-shot-[0-9a-f]{12}$/);
    expect(upload.signature).toMatch(/^[0-9a-f]{64}$/);

    // The ticket the browser gets back must describe exactly this upload and this admin.
    expect(readUploadTicket(upload.ticket)).toMatchObject({ publicId: upload.publicId, actorId: adminId });

    // The API secret never travels to the browser — only the key and the signature do.
    expect(JSON.stringify(upload)).not.toContain(settings!.apiSecret);

    expect(await db.asset.count({ where: { publicId: upload.publicId } })).toBe(0);
    expect(await db.auditLog.count({ where: { action: "media.sign", userId: adminId } })).toBe(1);
  });

  it("refuses an invalid ticket and a ticket minted for somebody else", async () => {
    expect((await expectAppError(registerUploadedAsset(adminId, { ticket: "garbage" }))).code).toBe("VALIDATION");

    const foreign = issueUploadTicket({
      publicId: `portfolio/images/1700000000-x-${suffix}`,
      resourceType: "IMAGE",
      actorId: "some-other-account",
    });
    expect((await expectAppError(registerUploadedAsset(adminId, { ticket: foreign }))).code).toBe("FORBIDDEN");
  });

  it.skipIf(!settings)("rejects an upload request for a type we do not accept", async () => {
    const error = await expectAppError(
      prepareUpload(adminId, { filename: "notes.txt", size: 1000, resourceType: "IMAGE" }),
    );
    expect(error.code).toBe("VALIDATION");
  });

  it("finds assets by public id and alt text", async () => {
    const id = await makeAsset(`portfolio/images/${suffix}-cover`, { altText: `Desk setup ${suffix}` });

    const byPublicId = await listAssets({ search: suffix });
    expect(byPublicId.rows.map((row) => row.id)).toContain(id);
    expect(await listAssets({ search: `${suffix}-nothing-matches` })).toMatchObject({ total: 0 });

    expect((await listAssets({ resourceType: "IMAGE" })).rows.map((row) => row.id)).toContain(id);
    // The dev database is shared and may already hold real videos — assert exclusion, not emptiness.
    const videos = await listAssets({ resourceType: "VIDEO" });
    expect(videos.rows.map((row) => row.id)).not.toContain(id);
  });

  it("sets and clears alt text", async () => {
    const id = await makeAsset(`portfolio/images/${suffix}-alt`);

    const saved = await updateAssetAltText(adminId, { id, altText: "Terminal on a laptop" });
    expect(saved.altText).toBe("Terminal on a laptop");

    const cleared = await updateAssetAltText(adminId, { id, altText: "" });
    expect(cleared.altText).toBeNull();
  });

  it("refuses to delete a file that a project still uses", async () => {
    const id = await makeAsset(`portfolio/images/${suffix}-thumb`);
    const project = await db.project.create({
      data: {
        title: `Referencing project ${suffix}`,
        slug: `referencing-${suffix}`,
        description: "Holds a thumbnail so the delete guard can be tested.",
        thumbnailAssetId: id,
      },
      select: { id: true },
    });
    projectIds.push(project.id);

    const error = await expectAppError(deleteAsset(adminId, { id }));
    expect(error.code).toBe("VALIDATION");
    expect(error.details?.fields).toMatchObject({ id: [expect.stringContaining("still uses this file")] });
    expect(await db.asset.count({ where: { id } })).toBe(1);
  });

  it.skipIf(!settings)("deletes an unreferenced file remotely and locally", async () => {
    const id = await makeAsset(`portfolio/images/${suffix}-doomed`);
    const removed = await deleteAsset(adminId, { id });

    expect(["destroyed", "already-gone"]).toContain(removed.remote);
    expect(await db.asset.count({ where: { id } })).toBe(0);
    expect(await db.auditLog.count({ where: { action: "media.delete", resourceId: id } })).toBe(1);
  });

  it("reports not found for an unknown asset", async () => {
    expect((await expectAppError(deleteAsset(adminId, { id: "cxxxxxxxxxxxxxxxxxxxxxxx" }))).code).toBe("NOT_FOUND");
  });
});

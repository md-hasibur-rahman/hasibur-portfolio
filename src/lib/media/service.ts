import "server-only";
import type { ZodError } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import {
  destroyUploadedResource,
  fetchUploadedResource,
  requireCloudinary,
  signUploadRequest,
  uploadEndpoint,
  type MediaResourceType,
} from "@/lib/cloudinary/server";
import { issueUploadTicket, readUploadTicket } from "@/lib/media/pending";
import {
  altTextSchema,
  assetIdSchema,
  assetQuerySchema,
  signUploadSchema,
  uploadTicketSchema,
} from "@/lib/validations/media";
import type { AssetResourceType } from "@prisma/client";

function invalid(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

function stemOf(filename: string) {
  const stem = filename.slice(0, filename.lastIndexOf(".")).toLowerCase();
  return stem.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "file";
}

export type SignedUpload = {
  endpoint: string;
  apiKey: string;
  publicId: string;
  resourceType: MediaResourceType;
  timestamp: number;
  signature: string;
  ticket: string;
};

// The browser gets an api_key, a timestamp and a signature over exactly {public_id, timestamp}.
// The public id already carries the folder path and the `folder` parameter is deliberately NOT
// sent to Cloudinary — with a path-bearing public id it would be concatenated twice. The API
// secret stays here, so a client can only write to the one public id we chose.
export async function prepareUpload(actorId: string, input: unknown): Promise<SignedUpload> {
  const parsed = signUploadSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const settings = requireCloudinary();

  const { filename, resourceType, size } = parsed.data;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${settings.folder}/${resourceType === "IMAGE" ? "images" : "videos"}`;
  const publicId = `${folder}/${timestamp}-${stemOf(filename)}-${randomBytes(6).toString("hex")}`;

  const upload: SignedUpload = {
    endpoint: uploadEndpoint(settings, resourceType),
    apiKey: settings.apiKey,
    publicId,
    resourceType,
    timestamp,
    signature: signUploadRequest(settings, { publicId, timestamp }),
    ticket: issueUploadTicket({ publicId, resourceType, actorId }),
  };

  await logAction({
    action: "media.sign",
    resource: "asset",
    userId: actorId,
    metadata: { filename: stemOf(filename), resourceType, size },
  });
  return upload;
}

const assetSelect = {
  id: true,
  publicId: true,
  secureUrl: true,
  resourceType: true,
  format: true,
  width: true,
  height: true,
  bytes: true,
  altText: true,
  createdAt: true,
} as const;

export async function registerUploadedAsset(actorId: string, input: unknown) {
  const parsed = uploadTicketSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const pending = readUploadTicket(parsed.data.ticket);
  if (!pending) {
    throw new AppError("VALIDATION", {
      details: { fields: { ticket: ["That upload ticket is invalid or expired. Please upload again."] } },
    });
  }
  if (pending.actorId !== actorId) throw forbidden();

  const remote = await fetchUploadedResource(pending.publicId, pending.resourceType);
  if (!remote) {
    throw new AppError("VALIDATION", {
      details: { fields: { file: ["Cloudinary has no file for that upload yet — please try again."] } },
    });
  }

  const data = {
    resourceType: pending.resourceType as AssetResourceType,
    secureUrl: remote.secureUrl,
    format: remote.format,
    width: remote.width,
    height: remote.height,
    bytes: remote.bytes,
    folder: remote.publicId.split("/").slice(0, -1).join("/") || null,
  };

  const asset = await db.asset.upsert({
    where: { publicId: remote.publicId },
    update: data,
    create: { publicId: remote.publicId, createdBy: actorId, ...data },
    select: assetSelect,
  });

  await logAction({
    action: "media.create",
    resource: "asset",
    resourceId: asset.id,
    userId: actorId,
    metadata: { publicId: asset.publicId, bytes: asset.bytes },
  });
  return asset;
}

export function listImageAssets() {
  return db.asset.findMany({
    where: { resourceType: "IMAGE" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, publicId: true, secureUrl: true, altText: true, width: true, height: true },
  });
}

export async function listAssets(raw: unknown) {
  const query = assetQuerySchema.parse(raw);
  const where = {
    ...(query.resourceType === "ALL" ? {} : { resourceType: query.resourceType }),
    ...(query.search
      ? {
          OR: [
            { publicId: { contains: query.search, mode: "insensitive" as const } },
            { altText: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { ...assetSelect, project: { select: { slug: true, title: true } } },
    }),
    db.asset.count({ where }),
  ]);
  return { rows, total, page: query.page, pageSize: query.pageSize };
}

export async function updateAssetAltText(actorId: string, input: unknown) {
  const parsed = altTextSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const existing = await db.asset.findUnique({ where: { id: parsed.data.id }, select: { id: true } });
  if (!existing) throw notFound();

  const asset = await db.asset.update({
    where: { id: parsed.data.id },
    data: { altText: parsed.data.altText && parsed.data.altText.length > 0 ? parsed.data.altText : null },
    select: assetSelect,
  });

  await logAction({
    action: "media.alt",
    resource: "asset",
    resourceId: asset.id,
    userId: actorId,
  });
  return asset;
}

export type MediaAsset = Awaited<ReturnType<typeof listAssets>>["rows"][number];

// A file still used as a project thumbnail is refused rather than silently breaking a published page.
export async function deleteAsset(actorId: string, input: unknown) {
  const parsed = assetIdSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const asset = await db.asset.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      publicId: true,
      resourceType: true,
      project: { select: { title: true, slug: true } },
    },
  });
  if (!asset) throw notFound();
  if (asset.project) {
    throw new AppError("VALIDATION", {
      details: {
        fields: {
          id: [`“${asset.project.title}” still uses this file. Choose another thumbnail first.`],
        },
      },
    });
  }

  const remote = await destroyUploadedResource(
    asset.publicId,
    asset.resourceType === "VIDEO" ? "VIDEO" : "IMAGE",
  );
  await db.asset.delete({ where: { id: asset.id } });

  await logAction({
    action: "media.delete",
    resource: "asset",
    resourceId: asset.id,
    userId: actorId,
    metadata: { publicId: asset.publicId, remote },
  });
  return { id: asset.id, remote };
}

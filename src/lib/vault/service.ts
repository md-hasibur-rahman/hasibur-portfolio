import "server-only";
import type { ZodError } from "zod";
import { db } from "@/lib/db/client";
import { AppError, notFound } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { decryptSecret, encryptSecret, vaultKey } from "@/lib/security/crypto";
import {
  apiCredentialSchema,
  apiCredentialUpdateSchema,
  recordIdSchema,
  revealRequestSchema,
  vaultItemSchema,
  vaultItemUpdateSchema,
  vaultQuerySchema,
} from "@/lib/validations/vault";

function invalid(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

// Blank means "nothing" on create and "keep what is stored" on update — the forms never show an
// existing secret back, so an untouched blank field must not wipe it.
function clean(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function encryptOrNull(value: string | undefined): string | null {
  const plain = clean(value);
  return plain === null ? null : encryptSecret(plain);
}

export function vaultConfigured(): boolean {
  try {
    vaultKey();
    return true;
  } catch {
    return false;
  }
}

export type VaultItemSummary = {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  category: string;
  hasPassword: boolean;
  hasNotes: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiCredentialSummary = {
  id: string;
  name: string;
  service: string;
  baseUrl: string | null;
  notes: string | null;
  hasKey: boolean;
  hasSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// The encrypted columns are selected only to derive the has*/not-null flags and are stripped
// before the summary leaves this module — no page, list or action result carries ciphertext.
const vaultItemSelect = {
  id: true,
  title: true,
  username: true,
  url: true,
  category: true,
  encryptedPassword: true,
  encryptedNotes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const credentialSelect = {
  id: true,
  name: true,
  service: true,
  baseUrl: true,
  notes: true,
  encryptedKey: true,
  encryptedSecret: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toVaultSummary(row: {
  id: string;
  title: string;
  username: string | null;
  url: string | null;
  category: string;
  encryptedPassword: string | null;
  encryptedNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): VaultItemSummary {
  const { encryptedPassword, encryptedNotes, ...meta } = row;
  return {
    ...meta,
    hasPassword: encryptedPassword !== null,
    hasNotes: encryptedNotes !== null,
  };
}

function toCredentialSummary(row: {
  id: string;
  name: string;
  service: string;
  baseUrl: string | null;
  notes: string | null;
  encryptedKey: string | null;
  encryptedSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ApiCredentialSummary {
  const { encryptedKey, encryptedSecret, ...meta } = row;
  return {
    ...meta,
    hasKey: encryptedKey !== null,
    hasSecret: encryptedSecret !== null,
  };
}

export async function listVaultItems(ownerId: string, raw: unknown) {
  const query = vaultQuerySchema.parse(raw);
  const where = {
    ownerId,
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" as const } },
            { username: { contains: query.search, mode: "insensitive" as const } },
            { url: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.vaultItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: vaultItemSelect,
    }),
    db.vaultItem.count({ where }),
  ]);
  return { rows: rows.map(toVaultSummary), total, page: query.page, pageSize: query.pageSize };
}

export async function listVaultCategories(ownerId: string) {
  const rows = await db.vaultItem.findMany({
    where: { ownerId },
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true },
  });
  return rows.map((row) => row.category);
}

export async function createVaultItem(actorId: string, input: unknown) {
  const parsed = vaultItemSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { title, username, password, notes, url, category } = parsed.data;
  const item = await db.vaultItem.create({
    data: {
      ownerId: actorId,
      title,
      username: clean(username),
      url: clean(url),
      category,
      encryptedPassword: encryptOrNull(password),
      encryptedNotes: encryptOrNull(notes),
    },
    select: vaultItemSelect,
  });

  await logAction({
    action: "vault.create",
    resource: "vault_item",
    resourceId: item.id,
    userId: actorId,
    metadata: { category },
  });
  return toVaultSummary(item);
}

export async function updateVaultItem(actorId: string, input: unknown) {
  const parsed = vaultItemUpdateSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { id, title, username, password, notes, url, category } = parsed.data;
  const existing = await db.vaultItem.findFirst({
    where: { id, ownerId: actorId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  const item = await db.vaultItem.update({
    where: { id: existing.id },
    data: {
      title,
      username: clean(username),
      url: clean(url),
      category,
      ...(password && password.length > 0 ? { encryptedPassword: encryptSecret(password) } : {}),
      ...(notes && notes.length > 0 ? { encryptedNotes: encryptSecret(notes) } : {}),
    },
    select: vaultItemSelect,
  });

  await logAction({
    action: "vault.update",
    resource: "vault_item",
    resourceId: item.id,
    userId: actorId,
    metadata: { category },
  });
  return toVaultSummary(item);
}

export type RevealedValue = { id: string; field: "password" | "notes" | "apiKey" | "apiSecret"; value: string };

// Decrypts a single field after every guard has passed. The plaintext lives only in this return
// value — it is never logged, cached, or part of any list response.
export async function revealVaultItem(actorId: string, input: unknown): Promise<RevealedValue> {
  const parsed = revealRequestSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const { id, field } = parsed.data;
  if (field !== "password" && field !== "notes") {
    throw new AppError("VALIDATION", { details: { fields: { field: ["Unknown field."] } } });
  }

  const item = await db.vaultItem.findFirst({
    where: { id, ownerId: actorId },
    select: { id: true, encryptedPassword: true, encryptedNotes: true },
  });
  if (!item) throw notFound();

  const payload = field === "password" ? item.encryptedPassword : item.encryptedNotes;
  if (!payload) {
    throw new AppError("VALIDATION", {
      details: { fields: { field: ["Nothing is stored in that field yet."] } },
    });
  }

  const value = decryptSecret(payload);
  await logAction({
    action: "vault.reveal",
    resource: "vault_item",
    resourceId: item.id,
    userId: actorId,
    metadata: { field },
  });
  return { id: item.id, field, value };
}

export async function deleteVaultItem(actorId: string, input: unknown) {
  const parsed = recordIdSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const existing = await db.vaultItem.findFirst({
    where: { id: parsed.data.id, ownerId: actorId },
    select: { id: true, title: true },
  });
  if (!existing) throw notFound();

  await db.vaultItem.delete({ where: { id: existing.id } });
  await logAction({
    action: "vault.delete",
    resource: "vault_item",
    resourceId: existing.id,
    userId: actorId,
    metadata: { title: existing.title },
  });
  return { id: existing.id };
}

export type VaultItemList = Awaited<ReturnType<typeof listVaultItems>>;
export type VaultItemRow = VaultItemList["rows"][number];

export async function listApiCredentials(ownerId: string, raw: unknown) {
  const query = vaultQuerySchema.parse(raw);
  const where = {
    ownerId,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { service: { contains: query.search, mode: "insensitive" as const } },
            { baseUrl: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.apiCredential.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: credentialSelect,
    }),
    db.apiCredential.count({ where }),
  ]);
  return { rows: rows.map(toCredentialSummary), total, page: query.page, pageSize: query.pageSize };
}

export async function createApiCredential(actorId: string, input: unknown) {
  const parsed = apiCredentialSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { name, service, apiKey, apiSecret, baseUrl, notes } = parsed.data;
  const credential = await db.apiCredential.create({
    data: {
      ownerId: actorId,
      name,
      service,
      baseUrl: clean(baseUrl),
      notes: clean(notes),
      encryptedKey: encryptOrNull(apiKey),
      encryptedSecret: encryptOrNull(apiSecret),
    },
    select: credentialSelect,
  });

  await logAction({
    action: "credential.create",
    resource: "api_credential",
    resourceId: credential.id,
    userId: actorId,
    metadata: { service },
  });
  return toCredentialSummary(credential);
}

export async function updateApiCredential(actorId: string, input: unknown) {
  const parsed = apiCredentialUpdateSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { id, name, service, apiKey, apiSecret, baseUrl, notes } = parsed.data;
  const existing = await db.apiCredential.findFirst({
    where: { id, ownerId: actorId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  const credential = await db.apiCredential.update({
    where: { id: existing.id },
    data: {
      name,
      service,
      baseUrl: clean(baseUrl),
      notes: clean(notes),
      ...(apiKey && apiKey.length > 0 ? { encryptedKey: encryptSecret(apiKey) } : {}),
      ...(apiSecret && apiSecret.length > 0 ? { encryptedSecret: encryptSecret(apiSecret) } : {}),
    },
    select: credentialSelect,
  });

  await logAction({
    action: "credential.update",
    resource: "api_credential",
    resourceId: credential.id,
    userId: actorId,
    metadata: { service },
  });
  return toCredentialSummary(credential);
}

export async function revealApiCredential(actorId: string, input: unknown): Promise<RevealedValue> {
  const parsed = revealRequestSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const { id, field } = parsed.data;
  if (field !== "apiKey" && field !== "apiSecret") {
    throw new AppError("VALIDATION", { details: { fields: { field: ["Unknown field."] } } });
  }

  const credential = await db.apiCredential.findFirst({
    where: { id, ownerId: actorId },
    select: { id: true, encryptedKey: true, encryptedSecret: true },
  });
  if (!credential) throw notFound();

  const payload = field === "apiKey" ? credential.encryptedKey : credential.encryptedSecret;
  if (!payload) {
    throw new AppError("VALIDATION", {
      details: { fields: { field: ["Nothing is stored in that field yet."] } },
    });
  }

  const value = decryptSecret(payload);
  await logAction({
    action: "credential.reveal",
    resource: "api_credential",
    resourceId: credential.id,
    userId: actorId,
    metadata: { field },
  });
  return { id: credential.id, field, value };
}

export async function deleteApiCredential(actorId: string, input: unknown) {
  const parsed = recordIdSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const existing = await db.apiCredential.findFirst({
    where: { id: parsed.data.id, ownerId: actorId },
    select: { id: true, name: true },
  });
  if (!existing) throw notFound();

  await db.apiCredential.delete({ where: { id: existing.id } });
  await logAction({
    action: "credential.delete",
    resource: "api_credential",
    resourceId: existing.id,
    userId: actorId,
    metadata: { name: existing.name },
  });
  return { id: existing.id };
}

export type CredentialList = Awaited<ReturnType<typeof listApiCredentials>>;
export type CredentialRow = CredentialList["rows"][number];

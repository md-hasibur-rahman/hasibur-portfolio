import "server-only";
import type { ZodError } from "zod";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { AppError, notFound } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { requestContext } from "@/lib/request";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { assertLoginAllowed, recordLoginAttempt } from "@/lib/security/rate-limit";
import {
  createShortLinkSchema,
  shortLinkIdSchema,
  slugSchema,
  unlockShortLinkSchema,
  updateShortLinkSchema,
} from "@/lib/validations/shortlink";

function invalid(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

function slugTaken(): never {
  throw new AppError("VALIDATION", {
    details: { fields: { slug: ["That short code is already in use — pick another."] } },
  });
}

const linkSelect = {
  id: true,
  slug: true,
  targetUrl: true,
  title: true,
  clicks: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
} as const;

// The hash never leaves the server: callers only ever see whether a password is set.
function toSummary(row: {
  id: string;
  slug: string;
  targetUrl: string;
  title: string | null;
  clicks: number;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { passwordHash, ...rest } = row;
  return { ...rest, hasPassword: passwordHash !== null };
}

export type ShortLinkSummary = ReturnType<typeof toSummary>;

export async function listShortLinks(): Promise<ShortLinkSummary[]> {
  const rows = await db.shortLink.findMany({
    orderBy: { createdAt: "desc" },
    select: linkSelect,
  });
  return rows.map(toSummary);
}

export async function createShortLink(actorId: string, input: unknown) {
  const parsed = createShortLinkSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { targetUrl, title, password } = parsed.data;
  const slug = parsed.data.slug ?? randomBytes(6).toString("hex");

  const existing = await db.shortLink.findUnique({ where: { slug }, select: { id: true } });
  if (existing) slugTaken();

  let link;
  try {
    link = await db.shortLink.create({
      data: {
        slug,
        targetUrl,
        title: title ? title : null,
        passwordHash: password && password.length > 0 ? await hashPassword(password) : null,
        createdBy: actorId,
      },
      select: linkSelect,
    });
  } catch (error) {
    // The unique index is the real guard; the pre-check above only exists for the friendlier error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") slugTaken();
    throw error;
  }

  await logAction({
    action: "shortlink.create",
    resource: "short_link",
    resourceId: link.id,
    userId: actorId,
    metadata: { slug: link.slug, hasPassword: link.passwordHash !== null },
  });
  return toSummary(link);
}

export async function updateShortLink(actorId: string, input: unknown) {
  const parsed = updateShortLinkSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { id, targetUrl, slug, title, password } = parsed.data;
  const existing = await db.shortLink.findUnique({
    where: { id },
    select: { id: true, slug: true, passwordHash: true },
  });
  if (!existing) throw notFound();

  if (slug !== undefined && slug !== existing.slug) {
    const clash = await db.shortLink.findUnique({ where: { slug }, select: { id: true } });
    if (clash) slugTaken();
  }

  const data: Prisma.ShortLinkUpdateInput = {};
  if (targetUrl !== undefined) data.targetUrl = targetUrl;
  if (slug !== undefined) data.slug = slug;
  if (title !== undefined) data.title = title.length > 0 ? title : null;
  if (password !== undefined) {
    data.passwordHash = password && password.length > 0 ? await hashPassword(password) : null;
  }

  let link;
  try {
    link = await db.shortLink.update({ where: { id }, data, select: linkSelect });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") slugTaken();
    throw error;
  }

  await logAction({
    action: "shortlink.update",
    resource: "short_link",
    resourceId: link.id,
    userId: actorId,
    metadata: {
      slug: link.slug,
      hasPassword: link.passwordHash !== null,
      passwordRemoved: existing.passwordHash !== null && link.passwordHash === null,
    },
  });
  return toSummary(link);
}

export async function deleteShortLink(actorId: string, input: unknown) {
  const parsed = shortLinkIdSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const existing = await db.shortLink.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true },
  });
  if (!existing) throw notFound();

  await db.shortLink.delete({ where: { id: existing.id } });
  await logAction({
    action: "shortlink.delete",
    resource: "short_link",
    resourceId: existing.id,
    userId: actorId,
    metadata: { slug: existing.slug },
  });
  return { id: existing.id, slug: existing.slug };
}

// Public lookup for /s/<slug>. Only the fields the page needs — the hash stays in the service.
export async function resolveShortLink(rawSlug: string | undefined) {
  const parsed = slugSchema.safeParse(rawSlug);
  if (!parsed.success) return null;

  const link = await db.shortLink.findUnique({
    where: { slug: parsed.data },
    select: { id: true, targetUrl: true, title: true, passwordHash: true },
  });
  if (!link) return null;

  return {
    id: link.id,
    targetUrl: link.targetUrl,
    title: link.title,
    requiresPassword: link.passwordHash !== null,
  };
}

export async function registerShortLinkClick(id: string) {
  await db.shortLink.update({ where: { id }, data: { clicks: { increment: 1 } } });
}

// Verifies the visitor password for a protected link. Throttled through the login-attempt feed
// with a namespaced key so brute-forcing one slug cannot lock anyone's account (and vice versa).
export async function unlockShortLink(input: unknown) {
  const parsed = unlockShortLinkSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);

  const { slug, password } = parsed.data;
  const { ipAddress } = await requestContext();
  const throttleKey = `shortlink:${slug}`;
  await assertLoginAllowed({ email: throttleKey, ipAddress });

  const link = await db.shortLink.findUnique({
    where: { slug },
    select: { id: true, targetUrl: true, passwordHash: true },
  });
  if (!link || !link.passwordHash) throw notFound();

  const ok = await verifyPassword(password, link.passwordHash);
  await recordLoginAttempt({ email: throttleKey, ipAddress, succeeded: ok });

  if (!ok) {
    await logAction({
      action: "shortlink.unlock",
      resource: "short_link",
      resourceId: link.id,
      status: "FAILURE",
      metadata: { slug },
    });
    throw new AppError("VALIDATION", {
      details: { fields: { password: ["That password does not match."] } },
    });
  }

  await registerShortLinkClick(link.id);
  await logAction({
    action: "shortlink.unlock",
    resource: "short_link",
    resourceId: link.id,
    metadata: { slug },
  });
  return { targetUrl: link.targetUrl };
}

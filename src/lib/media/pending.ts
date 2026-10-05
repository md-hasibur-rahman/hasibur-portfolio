import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MediaResourceType } from "@/lib/cloudinary/server";

const TTL_MS = 10 * 60 * 1000;

export type PendingUpload = {
  publicId: string;
  resourceType: MediaResourceType;
  actorId: string;
  exp: number;
};

function secret(): string {
  const raw = process.env.AUTH_SECRET ?? "";
  if (raw.length < 16) throw new Error("AUTH_SECRET is required to sign upload tickets.");
  return raw;
}

function hmac(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

// A ticket proves *we* authorised this exact public id for this admin, so the confirm step never has
// to trust a client-supplied id. It is short-lived and carries no secret material.
export function issueUploadTicket(input: Omit<PendingUpload, "exp">): string {
  const body = Buffer.from(
    JSON.stringify({ ...input, exp: Date.now() + TTL_MS }),
    "utf8",
  ).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function readUploadTicket(ticket: string): PendingUpload | null {
  const [body, signature] = ticket.split(".");
  if (!body || !signature) return null;

  const expected = hmac(body);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature)))
    return null;

  let payload: PendingUpload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PendingUpload;
  } catch {
    return null;
  }

  if (
    typeof payload?.publicId !== "string" ||
    typeof payload?.resourceType !== "string" ||
    typeof payload?.actorId !== "string" ||
    typeof payload?.exp !== "number"
  )
    return null;
  if (payload.exp < Date.now()) return null;

  return payload;
}

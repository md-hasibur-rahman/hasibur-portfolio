import { db } from "@/lib/db/client";
import { requestContext } from "@/lib/request";
import type { AuditStatus, Prisma } from "@prisma/client";

// Audit rows describe *what* happened. Anything secret-shaped must never be passed in metadata.
const REDACTED_KEYS = /password|secret|token|key|otp|authorization|cookie/i;

function redact(metadata?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    safe[key] = REDACTED_KEYS.test(key) ? "[redacted]" : value;
  }
  return safe as Prisma.InputJsonValue;
}

export async function logAction(input: {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string | null;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { ipAddress, userAgent } = await requestContext();
    await db.auditLog.create({
      data: {
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        userId: input.userId ?? null,
        status: input.status ?? "SUCCESS",
        ipAddress,
        userAgent,
        metadata: redact(input.metadata),
      },
    });
  } catch (error) {
    // Auditing must not be able to break the operation it is recording.
    console.error("Failed to write audit log", { action: input.action, error });
  }
}

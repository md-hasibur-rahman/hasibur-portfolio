import { db } from "@/lib/db/client";
import { auditQuerySchema } from "@/lib/validations/settings";

// Audit rows are append-only and already secret-redacted at write time; this view only reads them.
export async function listAuditEvents(raw: unknown) {
  const query = auditQuerySchema.parse(raw);

  const where = {
    ...(query.action ? { action: { contains: query.action, mode: "insensitive" as const } } : {}),
    ...(query.resource ? { resource: { contains: query.resource, mode: "insensitive" as const } } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.search
      ? {
          OR: [
            { action: { contains: query.search, mode: "insensitive" as const } },
            { resource: { contains: query.search, mode: "insensitive" as const } },
            { resourceId: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { user: { select: { id: true, email: true, role: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

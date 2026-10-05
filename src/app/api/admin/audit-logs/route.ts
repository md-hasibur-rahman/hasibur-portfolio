import { db } from "@/lib/db/client";
import { errorResponse } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/guards";
import { auditQuerySchema } from "@/lib/validations/settings";

// Admin-only audit log feed. Authorization is enforced here, not by hiding the dashboard link.
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const query = auditQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" as const } } : {}),
      ...(query.resource ? { resource: { contains: query.resource, mode: "insensitive" as const } } : {}),
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

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          status: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
          userId: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return Response.json({
      data: logs,
      meta: { page: query.page, pageSize: query.pageSize, total, adminId: admin.id },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

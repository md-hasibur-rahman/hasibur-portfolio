import { db } from "@/lib/db/client";
import { AppError, forbidden, notFound } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { userQuerySchema, userStatusSchema } from "@/lib/validations/user";

export function listUsers(raw: unknown) {
  const query = userQuerySchema.parse(raw);
  const search = query.search;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
          { username: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        emailVerified: true,
        blockedAt: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { sessions: { where: { revokedAt: null } }, conversations: true } },
      },
    }),
    db.user.count({ where }),
    db.user.count({ where: { blockedAt: { not: null } } }),
  ]);
}

// Blocking keeps the row and its history but breaks every session check, because the guards read
// blockedAt on each request. The owner can never block their own account.
export async function setUserBlocked(actorId: string, input: unknown) {
  const parsed = userStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", { details: { fields: parsed.error.flatten().fieldErrors } });
  }
  const { userId, blocked } = parsed.data;

  if (userId === actorId) throw forbidden();

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, blockedAt: true },
  });
  if (!target) throw notFound();
  if (target.role === "ADMIN" && blocked) {
    throw new AppError("VALIDATION", {
      details: { fields: { userId: ["Another admin account cannot be blocked from this screen."] } },
    });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { blockedAt: blocked ? new Date() : null },
    select: { id: true, blockedAt: true },
  });

  await logAction({
    action: blocked ? "user.block" : "user.unblock",
    resource: "user",
    resourceId: userId,
    userId: actorId,
  });
  return updated;
}

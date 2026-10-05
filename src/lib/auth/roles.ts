import type { Role } from "@prisma/client";

export function canAccessRole(userRole: Role, requiredRole: Role): boolean {
  // ADMIN is a superset of USER; USER never satisfies an ADMIN requirement.
  return userRole === requiredRole || userRole === "ADMIN";
}

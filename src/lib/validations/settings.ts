import { z } from "zod";

export const siteSettingsSchema = z.object({
  portfolioTitle: z.string().trim().min(1).max(120),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
  allowRegistration: z.boolean(),
  messageRateLimitPerHour: z.number().int().min(1).max(1000),
});

export const sessionRevokeSchema = z.object({
  sessionId: z.string().cuid(),
});

export const auditQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  userId: z.string().cuid().optional(),
  action: z.string().trim().max(80).optional(),
  resource: z.string().trim().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

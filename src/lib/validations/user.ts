import { z } from "zod";

export const userQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export const userStatusSchema = z.object({
  userId: z.string().cuid(),
  blocked: z.boolean(),
});

export type UserQuery = z.infer<typeof userQuerySchema>;

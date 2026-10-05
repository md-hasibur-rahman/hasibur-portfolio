import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const vaultItemSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(120),
  username: optionalText(160),
  // Sent once, encrypted server-side, and never returned by any list endpoint.
  password: optionalText(512),
  notes: optionalText(5000),
  url: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  category: z.string().trim().min(1).max(60).default("Other"),
});

export const vaultQuerySchema = z.object({
  search: optionalText(120),
  category: optionalText(60),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
});

export const apiCredentialSchema = z.object({
  name: z.string().trim().min(1, "Add a name").max(120),
  service: z.string().trim().min(1).max(80),
  apiKey: optionalText(1000),
  apiSecret: optionalText(1000),
  baseUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  notes: optionalText(2000),
});

export const recordIdSchema = z.object({ id: z.string().trim().min(1).max(60) });

export const vaultItemUpdateSchema = vaultItemSchema.extend({ id: z.string().trim().min(1).max(60) });

export const apiCredentialUpdateSchema = apiCredentialSchema.extend({
  id: z.string().trim().min(1).max(60),
});

// One field at a time: the client names the field it wants decrypted, never receives the rest.
export const revealRequestSchema = z.object({
  id: z.string().trim().min(1).max(60),
  field: z.enum(["password", "notes", "apiKey", "apiSecret"]),
});

export type VaultItemInput = z.infer<typeof vaultItemSchema>;
export type ApiCredentialInput = z.infer<typeof apiCredentialSchema>;

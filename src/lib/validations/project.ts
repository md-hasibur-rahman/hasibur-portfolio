import { z } from "zod";

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

const url = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .refine((value) => /^https?:\/\//i.test(value), "Use an http or https URL")
  .max(500)
  .optional()
  .or(z.literal(""));

export const projectSchema = z.object({
  title: z.string().trim().min(2).max(140),
  slug,
  description: z.string().trim().min(10).max(500),
  content: z.string().max(200_000).optional(),
  githubUrl: url,
  liveUrl: url,
  thumbnailAssetId: z.string().cuid().optional().or(z.literal("")),
  featured: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  technologyIds: z.array(z.string().cuid()).max(30).optional(),
});

export const projectOrderSchema = z.object({
  items: z
    .array(z.object({ id: z.string().cuid(), sortOrder: z.number().int().min(0) }))
    .min(1)
    .max(200),
});

export type ProjectInput = z.infer<typeof projectSchema>;

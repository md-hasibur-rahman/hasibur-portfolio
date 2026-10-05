import { z } from "zod";

const httpUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .refine((value) => /^https?:\/\//i.test(value), "Use an http or https URL");

const optionalUrl = httpUrl.max(500).optional().or(z.literal(""));

export const profileSchema = z.object({
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  website: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  twitterUrl: optionalUrl,
});

export type ProfileInput = z.infer<typeof profileSchema>;

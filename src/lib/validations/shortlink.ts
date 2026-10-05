import { z } from "zod";

// 3–48 chars: starts and ends alphanumeric, hyphens only in the middle.
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/;

// Uppercase input is normalised instead of rejected — the stored slug is always lowercase.
export const slugSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine((value) => SLUG_PATTERN.test(value), {
    message: "Use 3–48 lowercase letters, numbers or hyphens, starting and ending with a letter or number",
  });

// Redirect targets are admin-supplied but still restricted to http(s): a stored `javascript:` or
// `data:` URL would turn /s/<slug> into an XSS delivery mechanism.
export const targetUrlSchema = z
  .string()
  .trim()
  .min(1, { message: "Target URL is required" })
  .max(2048, { message: "That URL is too long" })
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Enter a full http(s) URL, e.g. https://example.com/page" },
  );

const passwordSchema = z
  .string()
  .max(128)
  .refine((value) => value.length === 0 || value.length >= 8, {
    message: "Use at least 8 characters (or leave empty for no password)",
  });

export const createShortLinkSchema = z.object({
  targetUrl: targetUrlSchema,
  // Empty string means "generate a random slug".
  slug: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    slugSchema.optional(),
  ),
  title: z.string().trim().max(120).optional(),
  password: passwordSchema.optional(),
});

export const updateShortLinkSchema = z.object({
  id: z.string().cuid(),
  targetUrl: targetUrlSchema.optional(),
  slug: slugSchema.optional(),
  title: z.string().trim().max(120).optional(),
  // undefined keeps the current password, "" or null removes it, a value sets a new one.
  password: passwordSchema.nullable().optional(),
});

export const shortLinkIdSchema = z.object({ id: z.string().cuid() });

export const unlockShortLinkSchema = z.object({
  slug: z.string().trim().min(1).max(48),
  password: z.string().min(1, { message: "Enter the password" }).max(128),
});

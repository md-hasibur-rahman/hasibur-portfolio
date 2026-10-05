import { z } from "zod";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 64 * 1024 * 1024;

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v"];

function extensionOf(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

// Only the extension is read from the client name, and it never reaches a path: the public id is
// generated server-side, so "../" or an absolute path in a filename cannot influence storage.
// The pattern is anchored — unanchored, "../../etc/passwd.jpg" matches on its "passwd.jpg" tail.
const filename = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) => /^[A-Za-z0-9][A-Za-z0-9 ._() -]*\.[A-Za-z0-9]+$/.test(value), {
    message: "Unsupported file name",
  });

export const signUploadSchema = z
  .object({
    filename,
    size: z.coerce.number().int().min(1),
    resourceType: z.enum(["IMAGE", "VIDEO"]),
  })
  .superRefine((value, ctx) => {
    const ext = extensionOf(value.filename);
    const allowed = value.resourceType === "IMAGE" ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
    if (!allowed.includes(ext)) {
      ctx.addIssue({
        code: "custom",
        path: ["filename"],
        message:
          value.resourceType === "IMAGE"
            ? `Images must be ${allowed.join(", ")}`
            : `Videos must be ${allowed.join(", ")}`,
      });
      return;
    }
    const max = value.resourceType === "IMAGE" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (value.size > max) {
      ctx.addIssue({
        code: "custom",
        path: ["size"],
        message: `Larger than ${Math.round(max / 1024 / 1024)} MB`,
      });
    }
  });

export const assetQuerySchema = z.object({
  resourceType: z.enum(["IMAGE", "VIDEO", "ALL"]).default("ALL"),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(6).max(60).default(18),
});

export const altTextSchema = z.object({
  id: z.string().cuid(),
  altText: z.string().trim().max(200).optional().or(z.literal("")),
});

export const assetIdSchema = z.object({ id: z.string().cuid() });

export const uploadTicketSchema = z.object({
  ticket: z.string().min(20).max(800),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;

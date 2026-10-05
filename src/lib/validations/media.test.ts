import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, assetQuerySchema, signUploadSchema } from "@/lib/validations/media";

function firstError(data: unknown, path: "filename" | "size" | "resourceType") {
  const parsed = signUploadSchema.safeParse(data);
  if (parsed.success) return null;
  return parsed.error.flatten().fieldErrors[path]?.[0] ?? null;
}

describe("upload request validation", () => {
  it("accepts common image types", () => {
    for (const name of ["shot.jpg", "shot.JPEG", "diagram.png", "screenshot.webp", "anim.gif"]) {
      expect(signUploadSchema.safeParse({ filename: name, size: 500_000, resourceType: "IMAGE" }).success, name).toBe(
        true,
      );
    }
  });

  it("refuses types that can carry script or that we do not render", () => {
    // SVG is deliberately absent: an uploaded SVG can embed script and is fetched from the CDN.
    expect(firstError({ filename: "logo.svg", size: 1000, resourceType: "IMAGE" }, "filename")).toContain("Images must be");
    expect(firstError({ filename: "payload.exe", size: 1000, resourceType: "IMAGE" }, "filename")).not.toBeNull();
    expect(firstError({ filename: "clip.avi", size: 1000, resourceType: "VIDEO" }, "filename")).toContain("Videos must be");
  });

  it("rejects path traversal and separator characters in a file name", () => {
    expect(firstError({ filename: "../../etc/passwd.jpg", size: 1000, resourceType: "IMAGE" }, "filename")).toContain(
      "Unsupported file name",
    );
    expect(firstError({ filename: "a\\b.jpg", size: 1000, resourceType: "IMAGE" }, "filename")).toContain(
      "Unsupported file name",
    );
    expect(firstError({ filename: ".jpg", size: 1000, resourceType: "IMAGE" }, "filename")).toContain(
      "Unsupported file name",
    );
  });

  it("caps size per resource type", () => {
    expect(firstError({ filename: "big.png", size: MAX_IMAGE_BYTES + 1, resourceType: "IMAGE" }, "size")).toContain("8 MB");
    expect(signUploadSchema.safeParse({ filename: "ok.png", size: MAX_IMAGE_BYTES, resourceType: "IMAGE" }).success).toBe(
      true,
    );
    expect(
      firstError({ filename: "movie.mp4", size: MAX_VIDEO_BYTES + 1, resourceType: "VIDEO" }, "size"),
    ).toContain("64 MB");
  });

  it("rejects an unknown size instead of defaulting it", () => {
    expect(signUploadSchema.safeParse({ filename: "a.png", resourceType: "IMAGE" }).success).toBe(false);
    expect(signUploadSchema.safeParse({ filename: "a.png", size: 0, resourceType: "IMAGE" }).success).toBe(false);
  });

  it("keeps the library query inside sane bounds", () => {
    expect(assetQuerySchema.parse({}).resourceType).toBe("ALL");
    expect(assetQuerySchema.parse({}).pageSize).toBe(18);
    expect(() => assetQuerySchema.parse({ resourceType: "RAW" })).toThrow();
    expect(() => assetQuerySchema.parse({ pageSize: 500 })).toThrow();
  });
});

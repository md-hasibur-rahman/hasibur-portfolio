import { describe, expect, it } from "vitest";
import {
  createShortLinkSchema,
  slugSchema,
  targetUrlSchema,
  updateShortLinkSchema,
} from "@/lib/validations/shortlink";

describe("short link slug", () => {
  it("accepts lowercase letters, numbers and inner hyphens", () => {
    for (const slug of ["abc", "launch-2026", "a1-b2-c3", "x".repeat(48)]) {
      expect(slugSchema.safeParse(slug).success, slug).toBe(true);
    }
  });

  it("normalises uppercase input instead of rejecting it", () => {
    const parsed = slugSchema.safeParse("  MyLink  ");
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toBe("mylink");
  });

  it("rejects bad shapes: too short, edge hyphens, symbols, spaces", () => {
    for (const slug of ["ab", "-abc", "abc-", "a--", "with space", "under_score", "dot.dot", "a/b", "Ünïcode"]) {
      expect(slugSchema.safeParse(slug).success, slug).toBe(false);
    }
  });

  it("rejects overlong slugs", () => {
    expect(slugSchema.safeParse("x".repeat(49)).success).toBe(false);
  });
});

describe("short link target URL", () => {
  it("accepts full http(s) URLs", () => {
    for (const url of ["https://example.com", "http://localhost:3000/page?a=1", "https://x.dev/deep/path#frag"]) {
      expect(targetUrlSchema.safeParse(url).success, url).toBe(true);
    }
  });

  it("refuses dangerous or relative targets", () => {
    // javascript:/data: targets would turn /s/<slug> into an XSS delivery vector.
    for (const url of ["javascript:alert(1)", "data:text/html,<script>", "ftp://x.com", "/relative", "example.com"]) {
      expect(targetUrlSchema.safeParse(url).success, url).toBe(false);
    }
  });
});

describe("create short link payload", () => {
  const base = { targetUrl: "https://example.com" };

  it("treats an empty slug as auto-generate and a missing password as none", () => {
    const parsed = createShortLinkSchema.safeParse({ ...base, slug: "", password: "" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.slug).toBeUndefined();
  });

  it("rejects short passwords but allows them to be absent", () => {
    expect(createShortLinkSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(createShortLinkSchema.safeParse({ ...base, password: "long-enough" }).success).toBe(true);
    expect(createShortLinkSchema.safeParse(base).success).toBe(true);
  });
});

describe("update short link payload", () => {
  it("distinguishes keep (undefined), remove (empty/null) and set", () => {
    const id = "cjld2cjxh0000qzrmn831i7rn";
    const keep = updateShortLinkSchema.safeParse({ id });
    expect(keep.success).toBe(true);
    expect(keep.success && "password" in keep.data).toBe(false);

    const removeEmpty = updateShortLinkSchema.safeParse({ id, password: "" });
    expect(removeEmpty.success && removeEmpty.data.password).toBe("");

    const removeNull = updateShortLinkSchema.safeParse({ id, password: null });
    expect(removeNull.success && removeNull.data.password).toBeNull();

    const set = updateShortLinkSchema.safeParse({ id, password: "brand-new-pass" });
    expect(set.success && set.data.password).toBe("brand-new-pass");
  });

  it("still refuses a too-short replacement password", () => {
    expect(updateShortLinkSchema.safeParse({ id: "cjld2cjxh0000qzrmn831i7rn", password: "short" }).success).toBe(false);
  });
});

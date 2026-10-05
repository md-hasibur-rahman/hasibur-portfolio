import { describe, expect, it } from "vitest";
import {
  FORMAT_PRESETS,
  downloaderLinksSchema,
  downloaderPreviewSchema,
  presetSchema,
} from "@/lib/validations/downloader";

describe("downloader validations", () => {
  it("accepts http and https URLs", () => {
    expect(downloaderPreviewSchema.safeParse({ url: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(
      true,
    );
    expect(
      downloaderPreviewSchema.safeParse({ url: "http://example.com/watch?v=1" }).success,
    ).toBe(true);
  });

  it("rejects non-http schemes, private targets and garbage", () => {
    const bad = [
      "javascript:alert(1)",
      "file:///etc/passwd",
      "ftp://example.com/x",
      "not a url",
      "",
      "https://",
    ];
    for (const value of bad) {
      expect(downloaderPreviewSchema.safeParse({ url: value }).success).toBe(false);
    }
  });

  it("only allows the fixed presets — a free-form format string never passes", () => {
    expect(presetSchema.safeParse("best-two").success).toBe(true);
    expect(presetSchema.safeParse("audio").success).toBe(true);
    expect(presetSchema.safeParse("bestvideo+bestaudio/best").success).toBe(false);
    expect(presetSchema.safeParse("1080p").success).toBe(false);
    expect(presetSchema.safeParse("").success).toBe(false);
  });

  it("strips unknown keys instead of forwarding them", () => {
    const parsed = downloaderPreviewSchema.parse({
      url: "https://example.com/video",
      format: "--exec something",
      extra: "value",
    });
    expect("format" in parsed).toBe(false);
    expect("extra" in parsed).toBe(false);
  });

  it("maps every preset to a non-empty format string and wires links schema", () => {
    for (const format of Object.values(FORMAT_PRESETS)) {
      expect(typeof format).toBe("string");
      expect(format.length).toBeGreaterThan(0);
    }
    expect(
      downloaderLinksSchema.safeParse({ url: "https://youtu.be/x", preset: "audio" }).success,
    ).toBe(true);
    expect(
      downloaderLinksSchema.safeParse({ url: "https://youtu.be/x", preset: "nope" }).success,
    ).toBe(false);
    expect(downloaderLinksSchema.safeParse({ url: "nope", preset: "audio" }).success).toBe(false);
  });
});

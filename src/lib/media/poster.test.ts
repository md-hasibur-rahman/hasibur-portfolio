import { describe, expect, it } from "vitest";
import { videoPosterUrl } from "@/lib/media/poster";

describe("videoPosterUrl", () => {
  it("swaps common video extensions for .jpg", () => {
    expect(videoPosterUrl("https://res.cloudinary.com/demo/video/upload/v1/clip.mp4")).toBe(
      "https://res.cloudinary.com/demo/video/upload/v1/clip.jpg",
    );
    expect(videoPosterUrl("https://res.cloudinary.com/demo/video/upload/v1/clip.MOV")).toBe(
      "https://res.cloudinary.com/demo/video/upload/v1/clip.jpg",
    );
    expect(videoPosterUrl("https://cdn.example.com/a.webm?x=1")).toBe("https://cdn.example.com/a.jpg");
  });

  it("leaves non-video URLs untouched", () => {
    const photo = "https://res.cloudinary.com/demo/image/upload/v1/photo.png?q=80";
    expect(videoPosterUrl(photo)).toBe(photo);
  });
});

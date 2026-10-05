import { z } from "zod";

const httpUrl = z
  .string()
  .trim()
  .min(1, "Paste a video URL")
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) URL");

// Only fixed presets reach the backend — the browser never sends a free-form yt-dlp
// format string.
export const presetSchema = z.enum(["best-two", "best-mp4", "1080", "720", "480", "audio"]);

export type FormatPreset = z.infer<typeof presetSchema>;

export const FORMAT_PRESETS: Record<FormatPreset, string> = {
  "best-two": "bestvideo+bestaudio/best",
  "best-mp4": "best[ext=mp4]/best",
  "1080": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
  "720": "bestvideo[height<=720]+bestaudio/best[height<=720]",
  "480": "bestvideo[height<=480]+bestaudio/best[height<=480]",
  audio: "bestaudio",
};

export const downloaderPreviewSchema = z.object({ url: httpUrl });

export const downloaderLinksSchema = z.object({ url: httpUrl, preset: presetSchema });

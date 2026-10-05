import "server-only";
import type { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { assertRateBudget } from "@/lib/security/rate-limit";
import {
  FORMAT_PRESETS,
  downloaderLinksSchema,
  downloaderPreviewSchema,
  type FormatPreset,
} from "@/lib/validations/downloader";

function invalid(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

export type DownloaderSettings = { baseUrl: string; apiKey: string };

// The Render service URL and its API key stay server-side; the browser only ever talks to
// this app's server actions.
export function downloaderSettings(): DownloaderSettings | null {
  const baseUrl = (process.env.YTDLP_API_URL ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.YTDLP_API_KEY ?? "").trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

const FETCH_ACTION = "tools.ytdlp.fetch";
const BUDGET_LIMIT = 30;
const BUDGET_WINDOW_MS = 15 * 60 * 1000;
// Longer than the service's own 90s yt-dlp timeout, so a slow-but-alive extraction still
// gets its answer through.
const FETCH_TIMEOUT_MS = 110_000;

// Transient/expected failures put a human explanation in fields.url; the client shows that
// text and falls back to the generic message otherwise.
function unavailable(message: string): AppError {
  return new AppError("UNAVAILABLE", { details: { fields: { url: [message] } } });
}

function requireDownloaderSettings(): DownloaderSettings {
  const settings = downloaderSettings();
  if (!settings) {
    throw unavailable(
      "The video downloader is not configured — add YTDLP_API_URL and YTDLP_API_KEY to .env.",
    );
  }
  return settings;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function callApi(
  settings: DownloaderSettings,
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams(params);
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}${path}?${query.toString()}`, {
      headers: { "X-API-Key": settings.apiKey, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw unavailable(
      timedOut
        ? "The downloader server did not answer in time. On the free Render tier a sleeping server can take about a minute to wake — try again."
        : "Could not reach the downloader server. Check YTDLP_API_URL in .env and that the Render service is live.",
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw unavailable("The downloader rejected the API key — check YTDLP_API_KEY in .env.");
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw unavailable("The downloader is starting up or timed out — try again in a minute.");
    }
    const remote = typeof body.error === "string" ? body.error.trim() : "";
    if (remote) throw unavailable(remote.slice(-400));
    throw unavailable(`The downloader server returned HTTP ${response.status}.`);
  }
  return body;
}

export type VideoPreview = {
  title: string;
  durationString: string | null;
  thumbnail: string | null;
  uploader: string | null;
  viewCount: number | null;
  webpageUrl: string;
  extractor: string | null;
};

export async function previewVideo(actorId: string, input: unknown): Promise<VideoPreview> {
  const parsed = downloaderPreviewSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const settings = requireDownloaderSettings();
  await assertRateBudget({
    userId: actorId,
    action: FETCH_ACTION,
    limit: BUDGET_LIMIT,
    windowMs: BUDGET_WINDOW_MS,
  });

  const body = await callApi(settings, "/info", { url: parsed.data.url });
  const title = typeof body.title === "string" ? body.title : "";
  if (!title) {
    throw unavailable(
      "yt-dlp could not extract that video. It may be private, age-restricted, or unsupported.",
    );
  }

  await logAction({
    action: FETCH_ACTION,
    resource: "tool",
    userId: actorId,
    metadata: { kind: "info", host: hostOf(parsed.data.url) },
  });

  return {
    title,
    durationString: typeof body.duration_string === "string" ? body.duration_string : null,
    thumbnail:
      typeof body.thumbnail === "string" && body.thumbnail.startsWith("https://")
        ? body.thumbnail
        : null,
    uploader: typeof body.uploader === "string" ? body.uploader : null,
    viewCount: typeof body.view_count === "number" ? body.view_count : null,
    webpageUrl: typeof body.webpage_url === "string" ? body.webpage_url : parsed.data.url,
    extractor: typeof body.extractor === "string" ? body.extractor : null,
  };
}

export type VideoLinks = { preset: FormatPreset; format: string; urls: string[] };

export async function linksForVideo(actorId: string, input: unknown): Promise<VideoLinks> {
  const parsed = downloaderLinksSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const settings = requireDownloaderSettings();
  await assertRateBudget({
    userId: actorId,
    action: FETCH_ACTION,
    limit: BUDGET_LIMIT,
    windowMs: BUDGET_WINDOW_MS,
  });

  const { url, preset } = parsed.data;
  const format = FORMAT_PRESETS[preset];
  const body =
    preset === "audio"
      ? await callApi(settings, "/audio-url", { url })
      : await callApi(settings, "/download-url", { url, format });

  const raw = preset === "audio" ? body.audio_url : body.download_url;
  const urls = (Array.isArray(raw) ? raw : [raw])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//.test(value));

  if (urls.length === 0) {
    throw unavailable("The downloader returned no usable URL for that format — try another format.");
  }

  await logAction({
    action: FETCH_ACTION,
    resource: "tool",
    userId: actorId,
    metadata: { kind: "links", preset },
  });
  return { preset, format, urls };
}

import { errorResponse } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/guards";

// Streams a remote video thumbnail through this origin so the strict CSP (img-src 'self'
// res.cloudinary.com) still applies and no third-party image host is allow-listed.
// Admin-only, like every downloader surface; the URL comes from our own yt-dlp API response.
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const PRIVATE_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.)/;
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[01])\./;

function isPublicHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "::1" || host === "[::1]") return false;
  return !PRIVATE_HOST.test(host) && !PRIVATE_172.test(host);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const raw = new URL(request.url).searchParams.get("url") ?? "";
    if (!isPublicHttpsUrl(raw)) {
      return Response.json(
        { error: { code: "VALIDATION", message: "A public https thumbnail URL is required." } },
        { status: 422 },
      );
    }

    const upstream = await fetch(raw, {
      cache: "no-store",
      headers: { accept: "image/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const declaredLength = Number(upstream.headers.get("content-length") ?? "0");
    if (!upstream.ok || !contentType.startsWith("image/") || declaredLength > MAX_BYTES) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Thumbnail unavailable." } },
        { status: 404 },
      );
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Thumbnail unavailable." } },
        { status: 404 },
      );
    }

    return new Response(buffer, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

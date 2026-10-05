"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { toResult, type ActionError } from "@/lib/action-result";
import {
  linksForVideo,
  previewVideo,
  type VideoLinks,
  type VideoPreview,
} from "@/lib/downloader/service";

type PreviewResult = { ok: true; video: VideoPreview } | ActionError;
type LinksResult = { ok: true; links: VideoLinks } | ActionError;

// Both actions proxy to the self-hosted yt-dlp API; the Render URL and API key never leave
// the server. Reads are rate-budgeted inside the service.
export async function previewVideoAction(payload: unknown): Promise<PreviewResult> {
  try {
    const admin = await requireAdmin();
    return { ok: true, video: await previewVideo(admin.id, payload) };
  } catch (error) {
    return toResult(error);
  }
}

export async function linksForVideoAction(payload: unknown): Promise<LinksResult> {
  try {
    const admin = await requireAdmin();
    return { ok: true, links: await linksForVideo(admin.id, payload) };
  } catch (error) {
    return toResult(error);
  }
}

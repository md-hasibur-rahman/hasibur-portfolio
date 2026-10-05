"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FilmIcon,
  LoaderCircleIcon,
  MusicIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/auth/form-parts";
import { linksForVideoAction, previewVideoAction } from "@/lib/downloader/actions";
import type { VideoLinks, VideoPreview } from "@/lib/downloader/service";
import type { FieldErrors } from "@/lib/action-result";
import type { FormatPreset } from "@/lib/validations/downloader";

const PRESETS: { value: FormatPreset; label: string }[] = [
  { value: "best-two", label: "Best quality — video + audio (2 files)" },
  { value: "best-mp4", label: "Single MP4 — one combined file" },
  { value: "1080", label: "Video up to 1080p + audio" },
  { value: "720", label: "Video up to 720p + audio" },
  { value: "480", label: "Video up to 480p + audio" },
  { value: "audio", label: "Audio only" },
];

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-elevated outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 dark:bg-input/25";

function errorText(result: { message: string; fields?: FieldErrors }) {
  return result.fields?.url?.[0] ?? result.message;
}

function formatViews(count: number | null) {
  if (count === null) return null;
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}

function linkLabel(preset: FormatPreset, index: number, count: number) {
  if (preset === "audio") return "Audio";
  if (count > 1) return index === 0 ? "Video stream" : "Audio stream";
  return "Video";
}

export function DownloaderCard() {
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState<VideoPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preset, setPreset] = useState<FormatPreset>("best-two");
  const [links, setLinks] = useState<VideoLinks | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [pendingPreview, startPreview] = useTransition();
  const [pendingLinks, startLinks] = useTransition();

  function onPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = url.trim();
    if (!value || pendingPreview) return;

    setPreviewError(null);
    setLinks(null);
    setLinksError(null);
    startPreview(async () => {
      const result = await previewVideoAction({ url: value });
      if (result.ok) {
        setVideo(result.video);
      } else {
        setVideo(null);
        setPreviewError(errorText(result));
      }
    });
  }

  function onGetLinks() {
    if (!video || pendingLinks) return;
    setLinksError(null);
    startLinks(async () => {
      const result = await linksForVideoAction({ url: video.webpageUrl, preset });
      if (result.ok) {
        setLinks(result.links);
      } else {
        setLinks(null);
        setLinksError(errorText(result));
      }
    });
  }

  async function copyLink(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Link copied.");
    } catch {
      toast.error("Clipboard is blocked in this browser.");
    }
  }

  const mergeHint = links && links.preset !== "audio" && links.urls.length > 1;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onPreview}>
          <div className="flex-1">
            <Label className="sr-only" htmlFor="dl-url">
              Video URL
            </Label>
            <Input
              id="dl-url"
              maxLength={2048}
              onChange={(event) => setUrl(event.currentTarget.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              type="url"
              value={url}
            />
          </div>
          <Button disabled={pendingPreview || url.trim().length === 0} type="submit">
            {pendingPreview ? (
              <LoaderCircleIcon className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <SearchIcon data-icon="inline-start" />
            )}
            {pendingPreview ? "Fetching…" : "Fetch info"}
          </Button>
        </form>

        {pendingPreview ? (
          <p className="text-xs text-muted-foreground">
            On the free Render tier the first request after idle can take about a minute while the
            service wakes up.
          </p>
        ) : null}

        {previewError ? <FormMessage message={previewError} /> : null}

        {video ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-[224px_1fr]">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-navy-950/10">
                {video.thumbnail ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="224px"
                    src={`/api/tools/downloader/thumbnail?url=${encodeURIComponent(video.thumbnail)}`}
                    unoptimized
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <FilmIcon className="size-6" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="text-sm font-medium leading-snug">{video.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {[video.uploader, video.durationString, formatViews(video.viewCount)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <a
                  className="flex w-fit items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:underline"
                  href={video.webpageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  {video.extractor ?? "Source"} page
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid w-full gap-2 sm:w-80">
                <Label htmlFor="dl-format">Format</Label>
                <select
                  className={selectClass}
                  id="dl-format"
                  onChange={(event) => setPreset(event.currentTarget.value as FormatPreset)}
                  value={preset}
                >
                  {PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button disabled={pendingLinks} onClick={onGetLinks} type="button">
                {pendingLinks ? (
                  <LoaderCircleIcon className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <DownloadIcon data-icon="inline-start" />
                )}
                {pendingLinks ? "Getting links…" : "Get download links"}
              </Button>
            </div>

            {linksError ? <FormMessage message={linksError} /> : null}

            {links ? (
              <div className="flex flex-col gap-2">
                {mergeHint ? (
                  <p className="text-xs text-muted-foreground">
                    Two files: download both and merge them with{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.68rem]">
                      ffmpeg -i video -i audio -c copy out.mp4
                    </code>{" "}
                    — or pick “Single MP4” for one combined file.
                  </p>
                ) : null}
                {links.urls.map((linkUrl, index) => (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3"
                    key={index}
                  >
                    <span className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                      {links.preset === "audio" ? (
                        <MusicIcon className="size-3.5" />
                      ) : (
                        <FilmIcon className="size-3.5" />
                      )}
                      {linkLabel(links.preset, index, links.urls.length)}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-[0.68rem] text-muted-foreground"
                      title={linkUrl}
                    >
                      {linkUrl}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <a href={linkUrl} rel="noreferrer" target="_blank">
                        <ExternalLinkIcon data-icon="inline-start" />
                        Open
                      </a>
                    </Button>
                    <Button onClick={() => copyLink(linkUrl)} size="sm" variant="outline">
                      <CopyIcon data-icon="inline-start" />
                      Copy
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Links are direct CDN URLs from the video host — open one and use the browser’s
                  “Save video as…”, or pass it to a download manager.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

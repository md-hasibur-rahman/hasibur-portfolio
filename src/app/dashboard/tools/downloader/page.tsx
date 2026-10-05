import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/guards";
import { DownloaderCard } from "@/components/dashboard/downloader-card";
import { ToolPageHeader } from "@/components/dashboard/tool-page-header";
import { downloaderSettings } from "@/lib/downloader/service";

export const metadata: Metadata = { title: "Video downloader" };

export default async function DownloaderToolPage() {
  await requireAdmin();
  const ready = downloaderSettings() !== null;

  return (
    <div className="flex flex-col gap-6">
      <ToolPageHeader
        description="Paste any yt-dlp supported URL. Metadata and direct links come from your self-hosted yt-dlp API on Render — files are never downloaded to this server."
        title="Video downloader"
      />

      {ready ? (
        <DownloaderCard />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Video downloader is not configured</CardTitle>
            <CardDescription>
              Deploy the yt-dlp-api repo to Render, then add YTDLP_API_URL and YTDLP_API_KEY to
              .env and restart. The downloader card appears here once both values are present —
              they are only ever read on the server.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

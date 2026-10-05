"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { finishUploadAction, requestUploadAction } from "@/lib/media/actions";
import type { SignedUpload } from "@/lib/media/service";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 64 * 1024 * 1024;

function describe(file: File) {
  if (IMAGE_TYPES.includes(file.type)) return { resourceType: "IMAGE" as const, max: MAX_IMAGE_BYTES };
  if (VIDEO_TYPES.includes(file.type)) return { resourceType: "VIDEO" as const, max: MAX_VIDEO_BYTES };
  return null;
}

// Direct browser-to-Cloudinary POST: the file never passes through this server, and the only
// credentials it carries are the api_key + signature the server issued for this one public id.
function postToCloudinary(file: File, upload: SignedUpload, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", upload.apiKey);
    body.append("timestamp", String(upload.timestamp));
    body.append("public_id", upload.publicId);
    body.append("signature", upload.signature);
    // No `folder` field on purpose: the public id already contains the folder path, and Cloudinary
    // would concatenate the folder parameter onto it, storing the file under folder/folder/name.

    const xhr = new XMLHttpRequest();
    xhr.open("POST", upload.endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let detail = "";
      try {
        detail =
          (JSON.parse(xhr.responseText) as { error?: { message?: string } })?.error?.message ?? "";
      } catch {
        // Non-JSON body: fall back to the status-only message.
      }
      reject(new Error(detail || `Cloudinary rejected the file (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(body);
  });
}

export function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    if (inputRef.current) inputRef.current.value = "";

    for (const file of files) {
      const shape = describe(file);
      if (!shape) {
        toast.error(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > shape.max) {
        toast.error(`${file.name}: larger than ${Math.round(shape.max / 1024 / 1024)} MB.`);
        continue;
      }

      setBusy(file.name);
      setPercent(0);

      const signed = await requestUploadAction({
        filename: file.name,
        size: file.size,
        resourceType: shape.resourceType,
      });
      if (!signed.ok) {
        toast.error(signed.message);
        setBusy(null);
        continue;
      }

      try {
        await postToCloudinary(file, signed.upload, setPercent);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed.");
        setBusy(null);
        continue;
      }

      const stored = await finishUploadAction({ ticket: signed.upload.ticket });
      setBusy(null);
      if (stored.ok) toast.success(`${file.name} is in the library.`);
      else toast.error(stored.message);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload</CardTitle>
        <CardDescription>
          Images up to 8 MB (jpg, png, webp, avif, gif) and videos up to 64 MB (mp4, webm, mov). The
          file goes straight to Cloudinary, never through this app.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/25 p-4 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void uploadFiles(Array.from(event.dataTransfer.files));
          }}
        >
          {busy ? (
            <div className="flex w-full max-w-sm flex-col gap-2">
              <span className="truncate font-mono text-[0.68rem] text-foreground">{busy}</span>
              <div
                aria-label={`Uploading ${busy}`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={percent}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted ring-1 ring-foreground/8"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-navy-950 transition-[width] dark:bg-navy-100"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em]">{percent}%</span>
            </div>
          ) : (
            <span className="flex flex-col items-center gap-2">
              <UploadCloudIcon className="size-6 text-muted-foreground/70" />
              Drop files here, or choose them below.
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          accept={`${IMAGE_TYPES.join(",")},${VIDEO_TYPES.join(",")}`}
          className="hidden"
          multiple
          onChange={(event) => void uploadFiles(Array.from(event.currentTarget.files ?? []))}
          type="file"
        />
        <Button
          className="w-fit"
          disabled={Boolean(busy)}
          onClick={() => inputRef.current?.click()}
          variant="outline"
        >
          <UploadCloudIcon data-icon="inline-start" />
          Choose files
        </Button>
      </CardContent>
    </Card>
  );
}

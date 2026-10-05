"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  InfoIcon,
  Link2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assetAltAction, deleteAssetAction } from "@/lib/media/actions";
import { videoPosterUrl } from "@/lib/media/poster";
import type { MediaAsset } from "@/lib/media/service";

function formatBytes(bytes: number | null) {
  if (!bytes) return "unknown size";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const iconButton =
  "flex size-10 items-center justify-center rounded-full bg-navy-50/10 text-navy-50 transition-colors hover:bg-navy-50/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-50";

function AssetInfoPanel({
  asset,
  onDeleted,
  onHide,
}: {
  asset: MediaAsset;
  onDeleted: () => void;
  onHide: () => void;
}) {
  const router = useRouter();
  const [alt, setAlt] = useState(asset.altText ?? "");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveAlt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await assetAltAction({ id: asset.id, altText: alt });
      if (result.ok) {
        toast.success("Alt text saved.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAssetAction({ id: asset.id });
      setConfirming(false);
      if (result.ok) {
        toast.success(result.message ?? "Deleted.");
        router.refresh();
        onDeleted();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(asset.secureUrl);
      toast.success("Public URL copied.");
    } catch {
      toast.error("Clipboard is blocked in this browser.");
    }
  }

  return (
    <aside
      aria-label="Asset details"
      className="absolute inset-y-0 right-0 z-20 w-full max-w-sm overflow-y-auto border-l border-navy-50/10 bg-card p-5 text-foreground shadow-elevated"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Details</h2>
          <button
            aria-label="Hide details"
            className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={onHide}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-1">
          <p className="break-all font-mono text-[0.68rem] text-foreground">{asset.publicId}</p>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted-foreground">
            {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
            {asset.format ?? asset.resourceType.toLowerCase()} · {formatBytes(asset.bytes)}
          </p>
        </div>

        {asset.project ? (
          <p className="flex items-start gap-1.5 text-xs text-foreground">
            <Link2Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            Used as thumbnail for {asset.project.title}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Not attached to a project</p>
        )}

        <form className="grid gap-2" onSubmit={saveAlt}>
          <Label className="text-xs" htmlFor={`viewer-alt-${asset.id}`}>
            Alt text
          </Label>
          <div className="flex gap-2">
            <Input
              disabled={pending}
              id={`viewer-alt-${asset.id}`}
              maxLength={200}
              onChange={(event) => setAlt(event.currentTarget.value)}
              placeholder="Describe the image for screen readers"
              value={alt}
            />
            <Button disabled={pending} size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>

        {confirming ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 p-3">
            <span className="text-xs text-muted-foreground">Delete remotely too?</span>
            <Button disabled={pending} onClick={remove} size="sm" variant="destructive">
              Confirm delete
            </Button>
            <Button
              disabled={pending}
              onClick={() => setConfirming(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={copyUrl} size="sm" variant="outline">
              <CopyIcon data-icon="inline-start" />
              Copy URL
            </Button>
            <Button onClick={() => setConfirming(true)} size="sm" variant="outline">
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MediaViewer({
  assets,
  index,
  onNavigate,
  onClose,
}: {
  assets: MediaAsset[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const asset = assets[index];

  useEffect(() => {
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (infoOpen) setInfoOpen(false);
        else onClose();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (event.key === "ArrowRight" && index < assets.length - 1) onNavigate(index + 1);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [assets.length, index, infoOpen, onClose, onNavigate]);

  if (!asset) return null;

  const label = asset.altText ?? asset.publicId;

  return (
    <div
      aria-label={`Preview of ${label}`}
      aria-modal="true"
      className="fixed inset-0 z-[70] flex flex-col bg-navy-950/95 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <header
        className="relative z-10 flex items-center gap-2 p-3 sm:p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="rounded-full bg-navy-50/10 px-3 py-1 font-mono text-[0.68rem] tracking-[0.08em] text-navy-100">
          {index + 1} / {assets.length}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="Toggle details"
            aria-pressed={infoOpen}
            className={`${iconButton} ${infoOpen ? "bg-navy-50/20" : ""}`}
            onClick={() => setInfoOpen((value) => !value)}
            type="button"
          >
            <InfoIcon className="size-4" />
          </button>
          <a
            aria-label="Open original in a new tab"
            className={iconButton}
            href={asset.secureUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLinkIcon className="size-4" />
          </a>
          <button
            aria-label="Close preview"
            className={iconButton}
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <XIcon className="size-5" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        {asset.resourceType === "IMAGE" ? (
          <div className="relative h-full w-full">
            <Image
              alt={label}
              className="object-contain"
              fill
              priority
              sizes="100vw"
              src={asset.secureUrl}
            />
          </div>
        ) : (
          <video
            autoPlay
            className="max-h-full w-auto max-w-full rounded-xl bg-black shadow-elevated"
            controls
            key={asset.id}
            onClick={(event) => event.stopPropagation()}
            playsInline
            poster={videoPosterUrl(asset.secureUrl)}
            src={asset.secureUrl}
          />
        )}
      </div>

      {index > 0 ? (
        <button
          aria-label="Previous item"
          className={`${iconButton} absolute left-2 top-1/2 z-10 size-11 -translate-y-1/2`}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(index - 1);
          }}
          type="button"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
      ) : null}

      {index < assets.length - 1 ? (
        <button
          aria-label="Next item"
          className={`${iconButton} absolute right-2 top-1/2 z-10 size-11 -translate-y-1/2`}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(index + 1);
          }}
          type="button"
        >
          <ChevronRightIcon className="size-6" />
        </button>
      ) : null}

      <footer
        className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-3 text-navy-100 sm:p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="truncate font-mono text-[0.68rem] tracking-[0.08em]">{asset.publicId}</p>
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-navy-100/70">
          {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
          {asset.format ?? asset.resourceType.toLowerCase()} · {formatBytes(asset.bytes)}
        </p>
      </footer>

      {infoOpen ? (
        <AssetInfoPanel
          asset={asset}
          key={asset.id}
          onDeleted={onClose}
          onHide={() => setInfoOpen(false)}
        />
      ) : null}
    </div>
  );
}

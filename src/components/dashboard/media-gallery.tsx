"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PlayIcon } from "lucide-react";
import { MediaViewer } from "@/components/dashboard/media-viewer";
import { videoPosterUrl } from "@/lib/media/poster";
import type { MediaAsset } from "@/lib/media/service";

export function MediaGallery({ assets }: { assets: MediaAsset[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());

  function close() {
    const id = openIndex !== null ? assets[openIndex]?.id : null;
    setOpenIndex(null);
    if (id) requestAnimationFrame(() => tiles.current.get(id)?.focus());
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {assets.map((asset, index) => {
          const label = asset.altText ?? asset.publicId;
          return (
            <button
              aria-label={`Open ${label}`}
              className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              key={asset.id}
              onClick={() => setOpenIndex(index)}
              ref={(node) => {
                if (node) tiles.current.set(asset.id, node);
                else tiles.current.delete(asset.id);
              }}
              type="button"
            >
              <Image
                alt={asset.resourceType === "IMAGE" ? label : ""}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1280px) 17vw, 13vw"
                src={
                  asset.resourceType === "IMAGE"
                    ? asset.secureUrl
                    : videoPosterUrl(asset.secureUrl)
                }
              />
              <span className="pointer-events-none absolute inset-0 bg-navy-950/0 transition-colors duration-300 group-hover:bg-navy-950/15" />
              {asset.resourceType === "VIDEO" ? (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-navy-950/70 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-navy-50 backdrop-blur-sm">
                  <PlayIcon className="size-2.5 fill-current" />
                  {asset.format ?? "video"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {openIndex !== null && assets[openIndex] ? (
        <MediaViewer
          assets={assets}
          index={openIndex}
          onClose={close}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </>
  );
}

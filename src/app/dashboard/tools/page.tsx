import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  DownloadIcon,
  Link2Icon,
  QrCodeIcon,
  type LucideIcon,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { downloaderSettings } from "@/lib/downloader/service";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  await requireAdmin();
  const downloaderReady = downloaderSettings() !== null;

  const tools: {
    href: string;
    title: string;
    description: string;
    icon: LucideIcon;
    status?: string;
  }[] = [
    {
      href: "/dashboard/tools/downloader",
      title: "Video downloader",
      description:
        "Fetch video metadata and direct download links through your own yt-dlp API on Render.",
      icon: DownloadIcon,
      ...(downloaderReady ? {} : { status: "Setup needed — see .env" }),
    },
    {
      href: "/dashboard/tools/qr",
      title: "QR studio",
      description:
        "Design QR codes with custom colours, a centre logo and export sizes — rendered in your browser.",
      icon: QrCodeIcon,
    },
    {
      href: "/dashboard/tools/links",
      title: "Short links",
      description:
        "Point /s/<code> at any http(s) URL, optionally behind a password, and follow the clicks.",
      icon: Link2Icon,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Utilities</p>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground">
          Small apps that run from this dashboard — pick one to open it.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            className="group flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-5 shadow-elevated transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-elevated-lg"
            href={tool.href}
            key={tool.href}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-navy-950/5 text-foreground/80 ring-1 ring-foreground/10 transition-colors group-hover:text-foreground dark:bg-navy-50/10">
                <tool.icon aria-hidden className="size-5" />
              </span>
              <ArrowUpRightIcon
                aria-hidden
                className="size-4 text-muted-foreground transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold tracking-tight">{tool.title}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {tool.description}
              </span>
            </div>
            {tool.status ? (
              <span className="w-fit rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-destructive ring-1 ring-destructive/20">
                {tool.status}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

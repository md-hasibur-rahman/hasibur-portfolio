import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, LockIcon } from "lucide-react";
import { registerShortLinkClick, resolveShortLink } from "@/lib/shortlinks/service";
import { UnlockForm } from "./unlock-form";

// Counting clicks during render and redirecting must never be cached or prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Protected link",
  robots: { index: false, follow: false },
};

export default async function ShortLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await resolveShortLink(slug);

  if (!link) notFound();

  if (!link.requiresPassword) {
    await registerShortLinkClick(link.id);
    redirect(link.targetUrl);
  }

  return (
    <main className="navy-panel relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-16">
      <div aria-hidden className="grid-lines absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-navy-400/15 blur-3xl"
      />

      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-navy-50/10 text-navy-100 ring-1 ring-navy-50/20">
            <LockIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.26em] text-navy-300">
              Protected link
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-navy-50">
              {link.title ?? "This link is password protected"}
            </h1>
            <p className="text-sm leading-relaxed text-navy-200">
              Enter the password to continue to the destination.
            </p>
          </div>
        </div>

        <UnlockForm slug={slug} />

        <Link
          className="mx-auto inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-navy-300 transition-colors hover:text-navy-100"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to site
        </Link>
      </div>
    </main>
  );
}

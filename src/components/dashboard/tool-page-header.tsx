import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export function ToolPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        className="inline-flex w-fit items-center gap-1.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        href="/dashboard/tools"
      >
        <ArrowLeftIcon aria-hidden className="size-3.5" />
        All tools
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}

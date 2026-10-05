import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSiteOwner } from "@/lib/queries/portfolio";

function initials(name: string | undefined) {
  if (!name) return "P";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const owner = await getSiteOwner();
  const name = owner?.name ?? "Portfolio";

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      {/* Brand panel: the only place the navy is allowed to fill the viewport. */}
      <div className="navy-panel relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="grid-lines absolute inset-0 opacity-60" />

        <div className="relative flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl bg-navy-50/12 font-mono text-[0.7rem] font-semibold text-navy-50 ring-1 ring-navy-50/20"
          >
            {initials(owner?.name)}
          </span>
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.26em] text-navy-200">
            {name}
          </span>
        </div>

        <div className="relative flex max-w-md flex-col gap-6">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-navy-300">
            Private area
          </p>
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-navy-50">
            Accounts, messages and the dashboard behind this site.
          </h2>
          <p className="text-sm leading-relaxed text-navy-200">
            Passwords are hashed with Argon2id and sessions live in HttpOnly cookies — never in
            localStorage. Everything past this screen is server-side checked on every request.
          </p>
        </div>

        <p className="relative font-mono text-[0.65rem] uppercase tracking-[0.22em] text-navy-300">
          Next.js · Prisma · PostgreSQL
        </p>
      </div>

      <div className="relative flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            href="/"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to site
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="animate-rise w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

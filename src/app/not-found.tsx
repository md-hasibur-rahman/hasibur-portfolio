import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="navy-panel relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <div aria-hidden className="grid-lines absolute inset-0 opacity-50" />

      <div className="relative flex max-w-lg flex-col items-center gap-5">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-navy-300">
          Error 404
        </span>
        <h1 className="text-6xl font-semibold tracking-[-0.04em] text-navy-50 sm:text-7xl">
          Nothing here
        </h1>
        <p className="text-sm leading-relaxed text-navy-200 sm:text-base">
          This address does not match a page, a project or an account. Draft and unpublished work is
          deliberately unreachable, so a missing project usually means it is not live yet.
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="border-transparent bg-navy-50 text-navy-950 shadow-elevated hover:bg-navy-100 hover:text-navy-950"
            size="lg"
          >
            <Link href="/">
              <ArrowLeftIcon data-icon="inline-start" />
              Back home
            </Link>
          </Button>
          <Button
            asChild
            className="border-navy-50/25 bg-navy-50/10 text-navy-50 shadow-none hover:bg-navy-50/18 hover:text-navy-50"
            size="lg"
            variant="outline"
          >
            <Link href="/projects">See the work</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

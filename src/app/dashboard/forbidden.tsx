import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardForbidden() {
  return (
    <main className="mx-auto flex w-full max-w-xl items-center px-6 py-24">
      <div className="surface animate-rise w-full p-8 text-center sm:p-10">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlertIcon aria-hidden="true" className="size-5" />
        </span>
        <p className="eyebrow mt-5">403</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">403 — Forbidden</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          The dashboard is restricted to the owner account. Your session is valid, but your role is
          not an admin.
        </p>
        <div className="mt-7 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/account">Go to your account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

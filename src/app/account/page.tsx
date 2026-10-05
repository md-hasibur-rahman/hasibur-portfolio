import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticateUser } from "@/lib/auth/guards";
import { logoutAction } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Account" };

function initials(name: string | undefined, email: string) {
  const source = name?.trim() ? name : email.split("@")[0] ?? "";
  const letters = source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "A";
}

export default async function AccountPage() {
  const user = await authenticateUser();
  if (!user) redirect("/login");

  const rows = [
    { label: "Username", value: `@${user.username}` },
    { label: "Email status", value: user.emailVerified ? "Verified" : "Not verified yet" },
  ];

  return (
    <main className="shell-narrow flex flex-col gap-6 py-14 sm:py-20">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Account</span>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Your session</h1>
      </header>

      <Card className="gap-6">
        <CardHeader className="flex-row items-center gap-4">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-navy-950 font-mono text-sm font-semibold text-navy-50 shadow-elevated dark:bg-navy-100 dark:text-navy-950"
          >
            {initials(user.name, user.email)}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle className="truncate text-xl">{user.name ?? user.email}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
              <span className="truncate">{user.email}</span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <dl className="grid gap-x-6 gap-y-4 border-t border-border/70 pt-6 text-sm sm:grid-cols-[10rem_1fr]">
            {rows.map((row) => (
              <div className="contents" key={row.label}>
                <dt className="eyebrow self-center">{row.label}</dt>
                <dd className="break-words font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex gap-3.5 rounded-2xl bg-muted/60 p-4 ring-1 ring-foreground/6">
            <ShieldCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This page re-reads your session from the database on every request, so a revoked
              session or a blocked account stops working immediately — not at the next login.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-6">
            {user.role === "ADMIN" ? (
              <Button asChild>
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            ) : null}
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                <LogOutIcon data-icon="inline-start" />
                Sign out
              </Button>
            </form>
            <Button asChild variant="ghost">
              <Link href="/">
                Back to site
                <ArrowUpRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

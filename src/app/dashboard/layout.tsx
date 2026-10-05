import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { ArrowUpRightIcon, CircleUserIcon, LogOutIcon } from "lucide-react";
import { DashboardRail, DashboardTopBar } from "@/components/dashboard/dash-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { authenticateUser } from "@/lib/auth/guards";
import { canAccessRole } from "@/lib/auth/roles";

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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await authenticateUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  // The layout is the guard boundary: every /dashboard/* page below it is admin-only, and a valid
  // USER session is sent to the forbidden boundary so the response really carries HTTP 403.
  if (!canAccessRole(user.role, "ADMIN")) forbidden();

  const identity = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 px-2">
        <span className="truncate text-sm font-medium text-sidebar-foreground">
          {user.name ?? user.email}
        </span>
        <span className="truncate font-mono text-[0.62rem] uppercase tracking-[0.16em] text-sidebar-foreground/55">
          {user.role.toLowerCase()}
        </span>
      </div>

      <div className="flex items-center gap-1 px-1">
        <ThemeToggle className="size-9 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        <Button
          asChild
          className="flex-1 justify-between text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          size="sm"
          variant="ghost"
        >
          <Link href="/">
            View site
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
        </Button>
      </div>

      <Button
        asChild
        className="justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        size="sm"
        variant="ghost"
      >
        <Link href="/account">
          <CircleUserIcon data-icon="inline-start" />
          Account
        </Link>
      </Button>

      <form action={logoutAction}>
        <Button
          className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          size="sm"
          type="submit"
          variant="ghost"
        >
          <LogOutIcon data-icon="inline-start" />
          Sign out
        </Button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/25">
      <DashboardRail mark={initials(user.name, user.email)}>
        {identity}
      </DashboardRail>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar email={user.email} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

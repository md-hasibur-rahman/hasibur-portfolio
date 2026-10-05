"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FolderKanbanIcon,
  ImageIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LockIcon,
  MailIcon,
  MenuIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon,
  WrenchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

// Defined here rather than passed from the server layout: component references cannot cross the
// server/client boundary, and keeping the list in one place means the rail and the drawer agree.
const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanbanIcon },
  { href: "/dashboard/messages", label: "Messages", icon: MailIcon },
  { href: "/dashboard/media", label: "Media", icon: ImageIcon },
  { href: "/dashboard/tools", label: "Tools", icon: WrenchIcon },
  { href: "/dashboard/vault", label: "Vault", icon: LockIcon },
  { href: "/dashboard/credentials", label: "Credentials", icon: KeyRoundIcon },
  { href: "/dashboard/users", label: "Users", icon: UsersIcon },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollTextIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
            href={link.href}
            key={link.href}
            onClick={onNavigate}
          >
            <link.icon
              aria-hidden
              className={cn(
                "size-4 shrink-0 transition-colors",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
              )}
            />
            <span className="truncate">{link.label}</span>
            {active ? (
              <span aria-hidden className="ml-auto size-1.5 rounded-full bg-current" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardRail({ mark, children }: { mark: string; children?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-lg bg-sidebar-primary/12 font-mono text-[0.65rem] font-semibold text-sidebar-primary ring-1 ring-sidebar-primary/20"
        >
          {mark}
        </span>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-sidebar-foreground/70">
          Dashboard
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <NavList />
      </div>

      <div className="border-t border-sidebar-border px-3 py-4">{children}</div>
    </aside>
  );
}

export function DashboardTopBar({ email }: { email: string }) {
  const pathname = usePathname();
  // Same trick as the public menu: the drawer is open only for the path it was opened on, so a
  // navigation closes it without an effect calling setState.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const title = links.find((link) => isActive(pathname, link.href))?.label ?? "Dashboard";

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-controls="dashboard-nav"
            aria-expanded={open}
            aria-label={open ? "Close dashboard menu" : "Open dashboard menu"}
            className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setOpenedOn(open ? null : pathname)}
            type="button"
          >
            {open ? <XIcon className="size-4.5" /> : <MenuIcon className="size-4.5" />}
          </button>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold tracking-tight">{title}</span>
            <span className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
              {email}
            </span>
          </div>
        </div>
      </header>

      {open ? (
        <>
          <button
            aria-label="Close dashboard menu"
            className="fixed inset-0 z-40 bg-navy-950/45 backdrop-blur-sm"
            onClick={() => setOpenedOn(null)}
            tabIndex={-1}
            type="button"
          />
          <div
            className="animate-rise fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-4 bg-sidebar p-4 text-sidebar-foreground"
            id="dashboard-nav"
          >
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-sidebar-foreground/70">
                Dashboard
              </span>
              <button
                aria-label="Close dashboard menu"
                className="grid size-8 place-items-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => setOpenedOn(null)}
                type="button"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpenedOn(null)} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

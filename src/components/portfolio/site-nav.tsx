"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { isActiveLink, navLinks } from "./nav-links";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
      {navLinks.map((link) => {
        const active = isActiveLink(pathname, link.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-3.5 py-2 text-sm transition-colors duration-150",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
            href={link.href}
            key={link.href}
          >
            {link.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3.5 -bottom-px h-px origin-center bg-foreground transition-transform duration-200",
                active ? "scale-x-100" : "scale-x-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ account }: { account?: { href: string; label: string } }) {
  const pathname = usePathname();
  // Recording the path the panel was opened on means a navigation closes it by itself:
  // once pathname differs, `open` is simply false — no effect, no cascading render.
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

  return (
    <div className="md:hidden">
      <Button
        aria-controls="mobile-nav"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenedOn(open ? null : pathname)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {open ? <XIcon className="size-4.5" /> : <MenuIcon className="size-4.5" />}
      </Button>

      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm"
            onClick={() => setOpenedOn(null)}
            tabIndex={-1}
            type="button"
          />
          <nav
            className="animate-rise fixed inset-x-0 top-16 z-50 border-b border-border/70 bg-background/95 px-5 pb-6 pt-3 backdrop-blur-xl"
            id="mobile-nav"
          >
            <ul className="flex flex-col">
              {navLinks.map((link, index) => {
                const active = isActiveLink(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-3 text-base transition-colors",
                        active
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                      href={link.href}
                    >
                      {link.label}
                      <span aria-hidden className="font-mono text-[0.65rem] text-muted-foreground/60">
                        0{index + 1}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {account ? (
              <div className="mt-4 border-t border-border/70 pt-4">
                <Button asChild className="w-full" size="lg">
                  <Link href={account.href}>{account.label}</Link>
                </Button>
              </div>
            ) : null}
          </nav>
        </>
      ) : null}
    </div>
  );
}

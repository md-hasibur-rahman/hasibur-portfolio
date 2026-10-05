import Link from "next/link";
import { MobileNav, SiteNav } from "@/components/portfolio/site-nav";
import { navLinks } from "@/components/portfolio/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { authenticateUser } from "@/lib/auth/guards";
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

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, owner] = await Promise.all([authenticateUser(), getSiteOwner()]);
  const name = owner?.name ?? "Portfolio";
  const profile = owner?.profile ?? null;

  const external = [
    profile?.githubUrl ? { href: profile.githubUrl, label: "GitHub" } : null,
    profile?.linkedinUrl ? { href: profile.linkedinUrl, label: "LinkedIn" } : null,
    profile?.twitterUrl ? { href: profile.twitterUrl, label: "Twitter" } : null,
    profile?.website ? { href: profile.website, label: "Website" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        href="#main"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link className="group flex min-w-0 items-center gap-2.5" href="/">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-950 font-mono text-[0.7rem] font-semibold tracking-tight text-navy-50 shadow-elevated transition-transform duration-200 group-hover:-translate-y-px dark:bg-navy-100 dark:text-navy-950"
              >
                {initials(owner?.name)}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold tracking-tight">{name}</span>
                <span className="truncate font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {profile?.location ? profile.location : "Full-stack developer"}
                </span>
              </span>
            </Link>
            <SiteNav />
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link href={user.role === "ADMIN" ? "/dashboard" : "/account"}>
                  {user.role === "ADMIN" ? "Dashboard" : "Account"}
                </Link>
              </Button>
            ) : (
              <Button asChild className="hidden sm:inline-flex" size="sm" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
            <MobileNav
              account={
                user
                  ? {
                      href: user.role === "ADMIN" ? "/dashboard" : "/account",
                      label: user.role === "ADMIN" ? "Dashboard" : "Account",
                    }
                  : { href: "/login", label: "Sign in" }
              }
            />
          </div>
        </div>
      </header>

      <main className="flex-1" id="main">
        {children}
      </main>

      <footer className="navy-panel mt-auto">
        <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.26em] text-navy-300">
              Portfolio
            </span>
            <p className="text-2xl font-semibold tracking-tight text-navy-50">{name}</p>
            {profile?.bio ? (
              <p className="max-w-sm text-sm leading-relaxed text-navy-200">{profile.bio}</p>
            ) : null}
            <Button
              asChild
              className="mt-2 w-fit border-navy-50/25 bg-navy-50/10 text-navy-50 shadow-none hover:bg-navy-50/18 hover:text-navy-50"
              size="sm"
              variant="outline"
            >
              <Link href="/contact">Start a conversation</Link>
            </Button>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-3">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.26em] text-navy-300">
              Navigate
            </span>
            <ul className="flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="link-underline text-sm text-navy-100 transition-colors hover:text-navy-50"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.26em] text-navy-300">
              Elsewhere
            </span>
            {external.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {external.map((link) => (
                  <li key={link.label}>
                    <a
                      className="link-underline text-sm text-navy-100 transition-colors hover:text-navy-50"
                      href={link.href}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-navy-300">No external profiles published yet.</p>
            )}
          </div>
        </div>

        <div className="border-t border-navy-50/12">
          <div className="shell flex flex-col gap-1.5 py-5 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
            <span>
              &copy; {new Date().getFullYear()} {name}
            </span>
            <span className="font-mono tracking-wide">Next.js · Prisma · PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

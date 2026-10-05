import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import portraitDark from "@/assets/hasibur-rahman-dark.jpg";
import portraitLight from "@/assets/hasibur-rahman-light.jpg";
import { EmptyNotice } from "@/components/portfolio/empty-notice";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  countPublishedProjects,
  getSiteOwner,
  listPublishedProjects,
  listPublishedTechnologies,
} from "@/lib/queries/portfolio";

export default async function HomePage() {
  const [projects, technologies, total, owner] = await Promise.all([
    listPublishedProjects(undefined, 6),
    listPublishedTechnologies(),
    countPublishedProjects(),
    getSiteOwner(),
  ]);

  const profile = owner?.profile ?? null;
  const name = owner?.name ?? "Selected work";
  const portraitAlt = owner?.name ? `Portrait of ${owner.name}` : "Portrait of the site owner";

  // Every number here is read from the database, so nothing on this page can drift into a claim.
  const stats = [
    { label: "Published projects", value: String(total).padStart(2, "0") },
    { label: "Tools in the stack", value: String(technologies.length).padStart(2, "0") },
    ...(profile?.location ? [{ label: "Based in", value: profile.location }] : []),
  ];

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="mesh absolute inset-0" />
        <div aria-hidden className="grid-lines absolute inset-0" />

        <div className="shell relative py-20 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
            <div className="flex flex-col gap-7">
              <p className="eyebrow animate-rise">
                Full-stack developer
                {profile?.location ? ` · ${profile.location}` : ""}
              </p>

              <h1
                className="animate-rise max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.03em] sm:text-6xl"
                style={{ animationDelay: "60ms" }}
              >
                {name}
              </h1>

              <p
                className="animate-rise max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{ animationDelay: "120ms" }}
              >
                {profile?.bio ??
                  "Desktop apps, APIs and web interfaces. Everything listed here is something I actually built."}
              </p>

              <div
                className="animate-rise flex flex-wrap gap-3 pt-1"
                style={{ animationDelay: "180ms" }}
              >
                <Button asChild size="lg">
                  <Link href="/projects">
                    View all work
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/about">About me</Link>
                </Button>
              </div>
            </div>

            <div
              className="animate-rise-soft mx-auto w-full max-w-[21rem] lg:mx-0 lg:max-w-none"
              style={{ animationDelay: "160ms" }}
            >
              <figure className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 translate-x-3 translate-y-3 rounded-[1.75rem] bg-gradient-to-br from-navy-100 via-navy-200 to-navy-300 dark:from-navy-700 dark:via-navy-800 dark:to-navy-950"
                />
                <div className="relative overflow-hidden rounded-[1.75rem] bg-[#f1f1f1] shadow-elevated-lg ring-1 ring-foreground/8 dark:bg-navy-950">
                  {/* Exactly one variant is visible per theme; both render because the html
                      class decides which, and the visible one is the LCP element in that mode. */}
                  <Image
                    alt={portraitAlt}
                    className="aspect-square w-full object-cover dark:hidden"
                    fetchPriority="high"
                    loading="eager"
                    placeholder="blur"
                    sizes="(min-width: 1024px) 352px, (min-width: 640px) 336px, 84vw"
                    src={portraitLight}
                  />
                  <Image
                    alt={portraitAlt}
                    className="hidden aspect-square w-full object-cover dark:block"
                    fetchPriority="high"
                    loading="eager"
                    placeholder="blur"
                    sizes="(min-width: 1024px) 352px, (min-width: 640px) 336px, 84vw"
                    src={portraitDark}
                  />
                </div>
              </figure>
            </div>
          </div>

          <dl
            className="animate-rise-soft mt-14 grid gap-x-8 gap-y-6 border-t border-border/70 pt-8 sm:grid-cols-3"
            style={{ animationDelay: "220ms" }}
          >
            {stats.map((stat) => (
              <div className="flex flex-col gap-1.5" key={stat.label}>
                <dt className="eyebrow">{stat.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="shell flex flex-col gap-8 py-16 sm:py-20">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Selected work</span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Things I shipped, not mockups
            </h2>
          </div>
          {total > projects.length ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/projects">
                All {total} projects
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </header>

        {projects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard index={index} key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyNotice
            body="This page reads live data from the database, so it stays empty until work is published from the dashboard instead of showing placeholder cards."
            title="No published projects yet"
          />
        )}
      </section>

      {technologies.length > 0 ? (
        <section className="border-t border-border/60 bg-muted/40">
          <div className="shell flex flex-col gap-6 py-14">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Toolkit</span>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Tools used across this work
              </h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {technologies.map((technology) => (
                <li key={technology}>
                  <Badge className="h-7 px-3" variant="outline">
                    {technology}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="shell flex flex-col items-start gap-5 py-16 sm:py-20">
        <span className="eyebrow">Contact</span>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-4xl">
          Have something worth building?
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Messages land in a private inbox on this site and stay there — nothing is posted publicly.
        </p>
        <Button asChild size="lg" className="mt-1">
          <Link href="/contact">
            Send a message
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

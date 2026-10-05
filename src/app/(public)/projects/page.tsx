import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { EmptyNotice } from "@/components/portfolio/empty-notice";
import { ProjectCard } from "@/components/portfolio/project-card";
import { listPublishedProjects, listPublishedTechnologies } from "@/lib/queries/portfolio";

export const metadata: Metadata = {
  title: "Work",
  description: "Projects I have designed, built and maintained.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tech?: string }>;
}) {
  const { tech } = await searchParams;
  const active = typeof tech === "string" && tech.trim() !== "" ? tech : undefined;

  const [projects, technologies] = await Promise.all([
    listPublishedProjects(active),
    listPublishedTechnologies(),
  ]);

  return (
    <div className="shell flex flex-col gap-10 py-14 sm:py-20">
      <header className="flex flex-col gap-4">
        <span className="eyebrow">Work</span>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.03em] sm:text-5xl">
          Everything here is built, not concept art
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Every entry is a project I built and can walk through. Draft and archived items never reach
          this list.
        </p>
      </header>

      {technologies.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/70 pb-4">
            <nav aria-label="Filter by technology" className="flex flex-wrap gap-2">
              <Link
                aria-pressed={!active}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] ring-1 transition-colors",
                  !active
                    ? "bg-navy-950 text-navy-50 ring-navy-950 dark:bg-navy-100 dark:text-navy-950 dark:ring-navy-100"
                    : "bg-card text-muted-foreground ring-foreground/10 hover:text-foreground",
                )}
                href="/projects"
              >
                All
              </Link>
              {technologies.map((name) => {
                const selected = active === name;
                return (
                  <Link
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] ring-1 transition-colors",
                      selected
                        ? "bg-navy-950 text-navy-50 ring-navy-950 dark:bg-navy-100 dark:text-navy-950 dark:ring-navy-100"
                        : "bg-card text-muted-foreground ring-foreground/10 hover:text-foreground",
                    )}
                    href={`/projects?tech=${encodeURIComponent(name)}`}
                    key={name}
                  >
                    {name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
            {active ? ` · ${active}` : ""}
          </p>
        </div>
      ) : null}

      {projects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard index={index} key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyNotice
          body={
            active
              ? "Pick another filter, or clear it to see everything that is live."
              : "Published work appears here from the dashboard. This page has no placeholder projects."
          }
          title={active ? `Nothing published under “${active}” yet` : "No published projects yet"}
        />
      )}
    </div>
  );
}

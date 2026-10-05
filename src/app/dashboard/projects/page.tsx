import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { listProjects } from "@/lib/projects/service";

export const metadata: Metadata = { title: "Projects" };

const statusVariant: Record<string, "secondary" | "outline" | "destructive"> = {
  PUBLISHED: "secondary",
  DRAFT: "outline",
  ARCHIVED: "destructive",
};

export default async function ProjectsAdminPage() {
  await requireAdmin();
  const projects = await listProjects();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow">Content</p>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} total · only Published rows are visible on the site
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <PlusIcon data-icon="inline-start" />
            New project
          </Link>
        </Button>
      </header>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
          No projects stored yet — create one, or run{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            npm run db:content
          </code>
          .
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated">
          <div className="hidden items-center justify-between gap-4 bg-muted/50 px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground sm:flex">
            <span>Project</span>
            <span>State</span>
          </div>
          <ul className="divide-y divide-border/70">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <Link
                  className="flex min-w-0 flex-col gap-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 rounded-lg"
                  href={`/dashboard/projects/${project.id}/edit`}
                >
                  <span className="truncate text-sm font-medium">{project.title}</span>
                  <span className="truncate font-mono text-[0.68rem] text-muted-foreground">
                    /projects/{project.slug} ·{" "}
                    {project.technologies.map((link) => link.technology.name).join(", ")}
                  </span>
                </Link>
                <span className="flex items-center gap-3">
                  {project.featured ? <Badge variant="secondary">Featured</Badge> : null}
                  <Badge variant={statusVariant[project.status] ?? "outline"}>
                    {project.status.toLowerCase()}
                  </Badge>
                  {project.status === "PUBLISHED" ? (
                    <a
                      className="link-underline inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      href={`/projects/${project.slug}`}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      View
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

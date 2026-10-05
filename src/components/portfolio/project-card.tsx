import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { technologyNames, type PortfolioProject } from "@/lib/queries/portfolio";

export function ProjectCard({
  project,
  index,
}: {
  project: PortfolioProject;
  index?: number;
}) {
  const names = technologyNames(project);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-elevated ring-1 ring-foreground/8 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-elevated-lg">
      {project.thumbnail ? (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            alt={project.thumbnail.altText ?? `${project.title} preview`}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            src={project.thumbnail.secureUrl}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </div>
      ) : (
        // No thumbnail has been uploaded, so show the real slug instead of pretending there is art.
        <div aria-hidden className="mesh relative aspect-video overflow-hidden bg-navy-950">
          <div className="grid-lines absolute inset-0" />
          <span className="absolute inset-0 grid place-items-center px-6 text-center font-mono text-[0.7rem] uppercase tracking-[0.24em] text-navy-200">
            {project.slug}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            {typeof index === "number" ? (
              <span className="font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground/70">
                {String(index + 1).padStart(2, "0")}
              </span>
            ) : null}
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              <Link
                className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
                href={`/projects/${project.slug}`}
              >
                {project.title}
              </Link>
            </h3>
          </div>
          {project.featured ? <Badge variant="secondary">Featured</Badge> : null}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>

        {names.length > 0 ? (
          <ul className="relative z-10 flex flex-wrap gap-1.5 pt-1">
            {names.map((name) => (
              <li key={name}>
                <Badge variant="outline">{name}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <span className="relative z-10 mt-auto inline-flex items-center gap-1 pt-3 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground">
          View case study
          <ArrowUpRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </article>
  );
}

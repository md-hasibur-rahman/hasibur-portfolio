import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, Code2Icon, ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/portfolio/prose";
import { getPublishedProject, technologyNames } from "@/lib/queries/portfolio";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: project.title,
    description: project.description,
    ...(project.thumbnail
      ? {
          openGraph: {
            images: [
              {
                url: project.thumbnail.secureUrl,
                alt: project.thumbnail.altText ?? project.title,
              },
            ],
          },
        }
      : {}),
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();

  const names = technologyNames(project);

  return (
    <article className="flex flex-col">
      {project.thumbnail ? (
        <div className="relative aspect-[21/9] max-h-[26rem] w-full overflow-hidden bg-navy-950">
          <Image
            alt={project.thumbnail.altText ?? `${project.title} preview`}
            className="object-cover"
            fill
            priority
            sizes="100vw"
            src={project.thumbnail.secureUrl}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent"
          />
        </div>
      ) : (
        <div aria-hidden className="mesh relative h-40 w-full overflow-hidden bg-navy-950 sm:h-56">
          <div className="grid-lines absolute inset-0" />
        </div>
      )}

      <div className="shell-narrow -mt-6 flex flex-col gap-10 pb-20 pt-6 sm:-mt-10">
        <Link
          className="inline-flex w-fit items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          href="/projects"
        >
          <ArrowLeftIcon className="size-3.5" />
          All work
        </Link>

        <header className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Case study · {project.slug}</span>
            <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
              {project.title}
            </h1>
          </div>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {project.description}
          </p>

          {names.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {names.map((name) => (
                <li key={name}>
                  <Badge className="h-7 px-3" variant="outline">
                    {name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {project.githubUrl || project.liveUrl ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {project.liveUrl ? (
                <Button asChild>
                  <a href={project.liveUrl} rel="noreferrer noopener" target="_blank">
                    Visit live site
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                </Button>
              ) : null}
              {project.githubUrl ? (
                <Button asChild variant="outline">
                  <a href={project.githubUrl} rel="noreferrer noopener" target="_blank">
                    <Code2Icon data-icon="inline-start" />
                    Source code
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="border-t border-border/70 pt-10">
          {project.content.trim() !== "" ? (
            <Prose content={project.content} />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              A full case study for this project has not been written yet.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

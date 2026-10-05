import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteProject } from "@/components/dashboard/delete-project";
import { ProjectForm, type ProjectFormValues } from "@/components/dashboard/project-form";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guards";
import { listImageAssets } from "@/lib/media/service";
import { getProject, listTechnologies } from "@/lib/projects/service";

export const metadata: Metadata = { title: "Edit project" };

const statusVariant: Record<string, "secondary" | "outline" | "destructive"> = {
  PUBLISHED: "secondary",
  DRAFT: "outline",
  ARCHIVED: "destructive",
};

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  let stored;
  try {
    stored = await getProject(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const technologies = await listTechnologies();
  const images = await listImageAssets();
  const values: ProjectFormValues = {
    id: stored.id,
    title: stored.title,
    slug: stored.slug,
    description: stored.description,
    content: stored.content,
    githubUrl: stored.githubUrl ?? "",
    liveUrl: stored.liveUrl ?? "",
    thumbnailAssetId: stored.thumbnailAssetId ?? "",
    featured: stored.featured,
    status: stored.status,
    sortOrder: stored.sortOrder,
    technologyIds: stored.technologies.map((link) => link.technologyId),
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            className="eyebrow inline-flex w-fit items-center gap-1.5 rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            href="/dashboard/projects"
          >
            <ArrowLeftIcon className="size-3" />
            All projects
          </Link>
          <span className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{stored.title}</h1>
            <Badge variant={statusVariant[stored.status] ?? "outline"}>
              {stored.status.toLowerCase()}
            </Badge>
          </span>
          <p className="font-mono text-[0.68rem] text-muted-foreground">
            /projects/{stored.slug}
            {stored.status === "PUBLISHED" ? (
              <>
                {" · "}
                <a
                  className="link-underline inline-flex items-center gap-1 hover:text-foreground"
                  href={`/projects/${stored.slug}`}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  view live
                  <ExternalLinkIcon className="size-3" />
                </a>
              </>
            ) : null}
          </p>
        </div>
        <DeleteProject id={stored.id} title={stored.title} />
      </header>

      <ProjectForm images={images} project={values} technologies={technologies} />
    </div>
  );
}

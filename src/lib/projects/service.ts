import type { ZodError } from "zod";
import { db } from "@/lib/db/client";
import { AppError, notFound } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { projectSchema } from "@/lib/validations/project";

function invalid(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

// The form allows blank optional URLs; an empty string must never be stored or rendered as a link.
function urlOr(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function technologyLinks(ids: string[]) {
  return ids.map((technologyId) => ({ technologyId }));
}

// Cuid format is already validated; this rejects ids that look right but do not exist, so a crafted
// payload cannot leave a project half-linked or surface a raw foreign-key error.
async function assertTechnologiesExist(ids: string[]) {
  if (ids.length === 0) return;
  const found = await db.technology.count({ where: { id: { in: ids } } });
  if (found !== new Set(ids).size) {
    throw new AppError("VALIDATION", { details: { fields: { technologyIds: ["Unknown technology"] } } });
  }
}

// Only an uploaded image that actually exists can be attached, so a crafted id cannot break the
// public page with a dangling thumbnail reference.
async function assertThumbnailExists(id: string | undefined) {
  if (!id) return;
  const found = await db.asset.count({ where: { id, resourceType: "IMAGE" } });
  if (found === 0) {
    throw new AppError("VALIDATION", { details: { fields: { thumbnailAssetId: ["Unknown image"] } } });
  }
}

export function listProjects() {
  return db.project.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { technologies: { include: { technology: true } } },
  });
}

export function listTechnologies() {
  return db.technology.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function getProject(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: { technologies: { select: { technologyId: true } } },
  });
  if (!project) throw notFound();
  return project;
}

async function assertSlugAvailable(slug: string, exceptId?: string) {
  const clash = await db.project.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== exceptId) {
    throw new AppError("VALIDATION", { details: { fields: { slug: ["This slug is already taken"] } } });
  }
}

export async function createProject(userId: string, input: unknown) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const data = parsed.data;
  const technologyIds = data.technologyIds ?? [];
  await assertSlugAvailable(data.slug);
  await assertTechnologiesExist(technologyIds);
  await assertThumbnailExists(data.thumbnailAssetId);

  const project = await db.project.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      content: data.content ?? "",
      githubUrl: urlOr(data.githubUrl),
      liveUrl: urlOr(data.liveUrl),
      thumbnailAssetId: data.thumbnailAssetId || null,
      featured: data.featured ?? false,
      status: data.status ?? "DRAFT",
      sortOrder: data.sortOrder ?? 0,
      technologies: { create: technologyLinks(technologyIds) },
    },
    select: { id: true, slug: true },
  });

  await logAction({
    action: "project.create",
    resource: "project",
    resourceId: project.id,
    userId,
    metadata: { slug: project.slug, status: data.status ?? "DRAFT" },
  });
  return project;
}

export async function updateProject(userId: string, id: string, input: unknown) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const data = parsed.data;

  const existing = await db.project.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) throw notFound();
  const technologyIds = data.technologyIds ?? [];
  await assertSlugAvailable(data.slug, id);
  await assertTechnologiesExist(technologyIds);
  await assertThumbnailExists(data.thumbnailAssetId);

  const project = await db.$transaction(async (tx) => {
    await tx.projectTechnology.deleteMany({ where: { projectId: id } });
    return tx.project.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        content: data.content ?? "",
        githubUrl: urlOr(data.githubUrl),
        liveUrl: urlOr(data.liveUrl),
        thumbnailAssetId: data.thumbnailAssetId || null,
        featured: data.featured ?? false,
        status: data.status ?? existing.status,
        sortOrder: data.sortOrder ?? 0,
        technologies: { create: technologyLinks(technologyIds) },
      },
      select: { id: true, slug: true },
    });
  });

  await logAction({
    action: "project.update",
    resource: "project",
    resourceId: project.id,
    userId,
    metadata: { slug: project.slug, status: data.status ?? existing.status },
  });
  return project;
}

export async function deleteProject(userId: string, id: string) {
  const existing = await db.project.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!existing) throw notFound();

  await db.project.delete({ where: { id } });
  await logAction({
    action: "project.delete",
    resource: "project",
    resourceId: id,
    userId,
    metadata: { slug: existing.slug },
  });
  return { id };
}

import { db } from "@/lib/db/client";

const technologyInclude = {
  technologies: {
    include: { technology: { select: { id: true, name: true } } },
    orderBy: { technology: { name: "asc" } },
  },
} as const;

const thumbnailInclude = {
  thumbnail: {
    select: {
      publicId: true,
      secureUrl: true,
      width: true,
      height: true,
      altText: true,
      format: true,
    },
  },
} as const;

const projectInclude = { ...technologyInclude, ...thumbnailInclude };

export type PortfolioProject = Awaited<ReturnType<typeof listPublishedProjects>>[number];

function publishedWhere(technology?: string) {
  return {
    status: "PUBLISHED" as const,
    ...(technology ? { technologies: { some: { technology: { name: technology } } } } : {}),
  };
}

export function listPublishedProjects(technology?: string, take?: number) {
  return db.project.findMany({
    where: publishedWhere(technology),
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    ...(take === undefined ? {} : { take }),
    include: projectInclude,
  });
}

export function getPublishedProject(slug: string) {
  return db.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: projectInclude,
  });
}

export function countPublishedProjects() {
  return db.project.count({ where: publishedWhere() });
}

// Filter chips are derived from published work only, so a draft project cannot advertise a
// technology that nothing public uses.
export async function listPublishedTechnologies() {
  const rows = await db.technology.findMany({
    where: { projects: { some: { project: { status: "PUBLISHED" } } } },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.map((row) => row.name);
}

export function getSiteOwner() {
  return db.user.findFirst({
    where: { role: "ADMIN", blockedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      username: true,
      profile: {
        select: {
          bio: true,
          location: true,
          website: true,
          githubUrl: true,
          linkedinUrl: true,
          twitterUrl: true,
        },
      },
    },
  });
}

export function technologyNames(project: PortfolioProject) {
  return project.technologies.map((link) => link.technology.name);
}

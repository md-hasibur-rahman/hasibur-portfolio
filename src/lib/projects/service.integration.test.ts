import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import { createProject, deleteProject, getProject, updateProject } from "@/lib/projects/service";

// Opt-in: run with RUN_DB_INTEGRATION=1 npm test
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);

let adminId = "";
let techA = "";
let techB = "";
const projectIds: string[] = [];

function fields(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    title: `Suite project ${slug}`,
    slug,
    description: "Written by the dashboard CRUD integration suite.",
    content: "## Notes\n- temporary row",
    githubUrl: "",
    liveUrl: "",
    ...overrides,
  };
}

async function expectAppError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error("Expected an AppError to be thrown");
}

beforeAll(async () => {
  if (!enabled) return;
  const admin = await db.user.create({
    data: {
      email: `crud-${suffix}@example.test`,
      name: "CRUD Admin",
      username: `crud${suffix}`,
      passwordHash: await hashPassword("Integration-Crud-123"),
      role: "ADMIN",
    },
    select: { id: true },
  });
  adminId = admin.id;

  const technologies = await Promise.all(
    [`alpha-${suffix}`, `beta-${suffix}`].map((name) =>
      db.technology.create({ data: { name }, select: { id: true } }),
    ),
  );
  [techA, techB] = technologies.map((row) => row.id);
});

afterAll(async () => {
  if (!enabled) return;
  await db.project.deleteMany({ where: { id: { in: projectIds } } });
  await db.technology.deleteMany({ where: { id: { in: [techA, techB] } } });
  await db.auditLog.deleteMany({
    where: { action: { in: ["project.create", "project.update", "project.delete"] }, resourceId: { in: projectIds } },
  });
  await db.user.deleteMany({ where: { id: adminId } });
});

suite("project dashboard CRUD", () => {
  it("creates a draft and links its technologies", async () => {
    const created = await createProject(adminId, fields(`draft-${suffix}`, { technologyIds: [techA, techB] }));
    projectIds.push(created.id);

    const stored = await db.project.findUniqueOrThrow({
      where: { id: created.id },
      include: { technologies: true },
    });
    expect(stored.status).toBe("DRAFT");
    expect(stored.githubUrl).toBeNull();
    expect(stored.technologies.map((row) => row.technologyId).sort()).toEqual([techA, techB].sort());
  });

  it("rejects a slug that is already taken", async () => {
    const error = await expectAppError(createProject(adminId, fields(`draft-${suffix}`)));
    expect(error.code).toBe("VALIDATION");
    expect(error.details?.fields).toMatchObject({ slug: ["This slug is already taken"] });
  });

  it("rejects unknown technology ids without writing anything", async () => {
    const bogus = "cxxxxxxxxxxxxxxxxxxxxxxx";
    const error = await expectAppError(
      createProject(adminId, fields(`guarded-${suffix}`, { technologyIds: [techA, bogus] })),
    );
    expect(error.code).toBe("VALIDATION");
    expect(await db.project.count({ where: { slug: `guarded-${suffix}` } })).toBe(0);
  });

  it("replaces technology links and clears the slug guard on update", async () => {
    const created = await createProject(adminId, fields(`edit-${suffix}`, { technologyIds: [techA] }));
    projectIds.push(created.id);

    await updateProject(adminId, created.id, fields(`edit-${suffix}`, { technologyIds: [techB], featured: true }));

    const stored = await db.project.findUniqueOrThrow({
      where: { id: created.id },
      include: { technologies: true },
    });
    expect(stored.featured).toBe(true);
    expect(stored.technologies.map((row) => row.technologyId)).toEqual([techB]);
  });

  it("keeps the same slug available when a project is renamed and restored", async () => {
    const created = await createProject(adminId, fields(`rename-${suffix}`));
    projectIds.push(created.id);

    await updateProject(adminId, created.id, fields(`renamed-${suffix}`));
    const back = await updateProject(adminId, created.id, fields(`rename-${suffix}`));
    expect(back.slug).toBe(`rename-${suffix}`);
  });

  it("deletes a project and cascades its technology links", async () => {
    const created = await createProject(adminId, fields(`doomed-${suffix}`, { technologyIds: [techA] }));
    await deleteProject(adminId, created.id);

    expect(await db.project.count({ where: { id: created.id } })).toBe(0);
    expect(await db.projectTechnology.count({ where: { projectId: created.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { action: "project.delete", resourceId: created.id } })).toBe(1);
  });

  it("reports not found for an unknown project id", async () => {
    const error = await expectAppError(getProject("cxxxxxxxxxxxxxxxxxxxxxxx"));
    expect(error.code).toBe("NOT_FOUND");
  });
});

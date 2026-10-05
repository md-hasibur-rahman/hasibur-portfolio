import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { projects, technologies } from "./content";

const db = new PrismaClient();

// Idempotent: safe to re-run after editing prisma/content.ts. It only touches technologies and
// projects, never the owner account, sessions or messages.
async function main() {
  const ids = new Map<string, string>();
  for (const name of technologies) {
    const row = await db.technology.upsert({ where: { name }, update: {}, create: { name } });
    ids.set(row.name, row.id);
  }

  let created = 0;
  let updated = 0;

  for (const item of projects) {
    const status = item.status ?? "PUBLISHED";
    const data = {
      title: item.title,
      description: item.description,
      content: item.content,
      status,
      featured: item.featured ?? false,
      sortOrder: item.sortOrder ?? 0,
    };

    const existing = await db.project.findUnique({ where: { slug: item.slug }, select: { id: true } });
    const project = await db.project.upsert({
      where: { slug: item.slug },
      update: data,
      create: { slug: item.slug, ...data },
    });
    if (existing) updated += 1;
    else created += 1;

    const technologyIds = item.technologies.map((name) => {
      const id = ids.get(name);
      if (!id) throw new Error(`Project "${item.slug}" lists unknown technology "${name}".`);
      return id;
    });

    await db.projectTechnology.deleteMany({ where: { projectId: project.id } });
    if (technologyIds.length > 0) {
      await db.projectTechnology.createMany({
        data: technologyIds.map((technologyId) => ({ projectId: project.id, technologyId })),
      });
    }
  }

  console.log(`Content ready: ${created} projects created, ${updated} updated, ${ids.size} technologies.`);
  console.log("Draft entries stay hidden from public routes until their status is PUBLISHED.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });

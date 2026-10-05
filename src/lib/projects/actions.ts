"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { toResult, type ActionResult } from "@/lib/action-result";
import { createProject, deleteProject, updateProject } from "@/lib/projects/service";

const deleteSchema = z.object({ id: z.string().cuid() });

// Public pages can be prerendered, so a write has to invalidate the routes that read the same rows.
function revalidatePortfolio(slug?: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/about");
  revalidatePath("/dashboard/projects");
  if (slug) revalidatePath(`/projects/${slug}`);
}

export async function saveProjectAction(
  payload: unknown,
): Promise<ActionResult & { id?: string }> {
  try {
    const admin = await requireAdmin();
    const { id, ...fields } = (payload ?? {}) as Record<string, unknown>;
    const project =
      typeof id === "string" && id.length > 0
        ? await updateProject(admin.id, id, fields)
        : await createProject(admin.id, fields);

    revalidatePortfolio(project.slug);
    return { ok: true, id: project.id, message: `Saved /projects/${project.slug}` };
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteProjectAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const { id } = deleteSchema.parse(payload);
    await deleteProject(admin.id, id);
    revalidatePortfolio();
    return { ok: true, message: "Project deleted." };
  } catch (error) {
    return toResult(error);
  }
}

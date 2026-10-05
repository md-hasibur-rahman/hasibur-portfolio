import type { Metadata } from "next";
import { ProjectForm } from "@/components/dashboard/project-form";
import { requireAdmin } from "@/lib/auth/guards";
import { listImageAssets } from "@/lib/media/service";
import { listTechnologies } from "@/lib/projects/service";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireAdmin();
  const [technologies, images] = await Promise.all([listTechnologies(), listImageAssets()]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="eyebrow">Content · Projects</p>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Starts as a draft; publishing is a separate choice.
        </p>
      </header>
      <ProjectForm images={images} technologies={technologies} />
    </div>
  );
}

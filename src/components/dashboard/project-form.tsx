"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage } from "@/components/auth/form-parts";
import { saveProjectAction } from "@/lib/projects/actions";
import type { FieldErrors } from "@/lib/action-result";

export type ProjectFormValues = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  githubUrl: string;
  liveUrl: string;
  thumbnailAssetId: string;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  technologyIds: string[];
};

export type ImageOption = { id: string; publicId: string; secureUrl: string; altText: string | null };

// Native selects get the same shell as Input so the form reads as one family.
const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-elevated outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 dark:bg-input/25";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function ProjectForm({
  project,
  technologies,
  images,
}: {
  project?: ProjectFormValues;
  technologies: { id: string; name: string }[];
  images: ImageOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(project?.slug));
  const [selected, setSelected] = useState<string[]>(project?.technologyIds ?? []);
  const [thumbnailId, setThumbnailId] = useState(project?.thumbnailAssetId ?? "");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");

    const payload = {
      ...(project?.id ? { id: project.id } : {}),
      title: get("title"),
      slug,
      description: get("description"),
      content: get("content"),
      githubUrl: get("githubUrl"),
      liveUrl: get("liveUrl"),
      thumbnailAssetId: thumbnailId,
      featured: form.get("featured") === "on",
      status: get("status"),
      sortOrder: Number(get("sortOrder") || 0),
      technologyIds: selected,
    };

    setMessage(undefined);
    setErrors(undefined);

    startTransition(async () => {
      const result = await saveProjectAction(payload);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        if (result.id) router.push(`/dashboard/projects/${result.id}/edit`);
        router.refresh();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  const chosen = images.find((image) => image.id === thumbnailId) ?? null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>
            Draft, published and archived all live here; only PUBLISHED rows reach the public site.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Field id="title" label="Title" errors={errors?.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={140}
              defaultValue={project?.title ?? ""}
              onChange={(event) => {
                if (!slugTouched) setSlug(toSlug(event.currentTarget.value));
              }}
            />
          </Field>

          <Field id="slug" label="Slug (public URL)" errors={errors?.slug}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">/projects/</span>
              <Input
                id="slug"
                value={slug}
                required
                maxLength={80}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.currentTarget.value.toLowerCase());
                }}
              />
            </div>
          </Field>

          <Field id="description" label="One-paragraph summary" errors={errors?.description}>
            <Textarea
              id="description"
              name="description"
              rows={3}
              required
              maxLength={500}
              defaultValue={project?.description ?? ""}
            />
          </Field>

          <Field id="content" label="Case study (## heading, - bullet)" errors={errors?.content}>
            <Textarea
              id="content"
              name="content"
              rows={12}
              maxLength={200000}
              defaultValue={project?.content ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links and state</CardTitle>
          <CardDescription>Leave a URL blank instead of inventing one.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field id="githubUrl" label="Source URL" errors={errors?.githubUrl}>
            <Input id="githubUrl" name="githubUrl" type="url" defaultValue={project?.githubUrl ?? ""} />
          </Field>
          <Field id="liveUrl" label="Live URL" errors={errors?.liveUrl}>
            <Input id="liveUrl" name="liveUrl" type="url" defaultValue={project?.liveUrl ?? ""} />
          </Field>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              className={selectClass}
              defaultValue={project?.status ?? "DRAFT"}
              id="status"
              name="status"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={project?.sortOrder ?? 0}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50 sm:col-span-2">
            <input
              className="size-4 accent-primary"
              defaultChecked={project?.featured ?? false}
              name="featured"
              type="checkbox"
            />
            Featured on the home page
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thumbnail</CardTitle>
          <CardDescription>
            {images.length === 0
              ? "Nothing uploaded yet — the public cards work fine without an image."
              : `${images.length} image${images.length === 1 ? "" : "s"} in the media library.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="grid content-start gap-2">
            <Label htmlFor="thumbnailAssetId">Library image</Label>
            <select
              className={selectClass}
              id="thumbnailAssetId"
              onChange={(event) => setThumbnailId(event.currentTarget.value)}
              value={thumbnailId}
            >
              <option value="">No thumbnail</option>
              {images.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.altText ?? image.publicId}
                </option>
              ))}
            </select>
            {errors?.thumbnailAssetId ? <FormMessage message={errors.thumbnailAssetId.join(" ")} /> : null}
            <Link
              className="link-underline w-fit text-xs text-muted-foreground hover:text-foreground"
              href="/dashboard/media"
            >
              Upload files in Media
            </Link>
          </div>

          {chosen ? (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/8">
              <Image
                src={chosen.secureUrl}
                alt={chosen.altText ?? chosen.publicId}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/25 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
              No preview
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>
            {technologies.length} available. New names appear on /projects filters once published.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {technologies.map((technology) => {
            const on = selected.includes(technology.id);
            return (
              <button
                aria-pressed={on}
                className={
                  on
                    ? "rounded-full bg-navy-950 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-navy-50 dark:bg-navy-100 dark:text-navy-950"
                    : "rounded-full bg-card px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:text-foreground"
                }
                key={technology.id}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(technology.id)
                      ? current.filter((value) => value !== technology.id)
                      : [...current, technology.id],
                  )
                }
                type="button"
              >
                {technology.name}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <FormMessage message={message} />

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-elevated backdrop-blur">
        <Button disabled={pending} size="lg" type="submit">
          {project?.id ? "Save changes" : "Create project"}
        </Button>
        <Button onClick={() => router.push("/dashboard/projects")} type="button" variant="ghost">
          Back to list
        </Button>
      </div>
    </form>
  );
}

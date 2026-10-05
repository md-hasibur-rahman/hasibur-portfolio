import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MediaGallery } from "@/components/dashboard/media-gallery";
import { MediaUploader } from "@/components/dashboard/media-uploader";
import { cloudinarySettings } from "@/lib/cloudinary/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listAssets } from "@/lib/media/service";

export const metadata: Metadata = { title: "Media" };

const filters = [
  { value: "ALL", label: "All" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
];

const chipBase =
  "rounded-full px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] transition-colors";
const chipOn = "bg-navy-950 text-navy-50 dark:bg-navy-100 dark:text-navy-950";
const chipOff = "bg-card text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settings = cloudinarySettings();

  const resourceType =
    params.type === "IMAGE" || params.type === "VIDEO" ? params.type : ("ALL" as const);

  const { rows, total, page, pageSize } = await listAssets({
    resourceType,
    pageSize: 36,
    ...(params.search ? { search: params.search } : {}),
    ...(params.page ? { page: params.page } : {}),
  });

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow">Assets</p>
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="text-sm text-muted-foreground">
            {total} file{total === 1 ? "" : "s"} in the library
          </p>
        </div>
        <form className="flex gap-2" action="/dashboard/media">
          {resourceType !== "ALL" ? <input name="type" type="hidden" value={resourceType} /> : null}
          <Input
            className="w-56"
            defaultValue={params.search ?? ""}
            maxLength={120}
            name="search"
            placeholder="Search public id or alt text"
          />
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            Search
          </Button>
        </form>
      </header>

      {settings ? (
        <MediaUploader />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cloudinary is not configured</CardTitle>
            <CardDescription>
              Uploads stay disabled until CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
              CLOUDINARY_API_SECRET are present in .env. The library below still shows anything
              already registered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The API secret is only ever read on the server — the browser receives a signature for
              one specific public id.
            </p>
          </CardContent>
        </Card>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Filter by type">
        {filters.map((filter) => (
          <Link
            aria-current={filter.value === resourceType ? "true" : undefined}
            className={`${chipBase} ${filter.value === resourceType ? chipOn : chipOff}`}
            href={
              filter.value === "ALL"
                ? "/dashboard/media"
                : `/dashboard/media?type=${filter.value}${params.search ? `&search=${encodeURIComponent(params.search)}` : ""}`
            }
            key={filter.value}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
          No files match this view yet.
        </p>
      ) : (
        <MediaGallery assets={rows} />
      )}

      {pages > 1 ? (
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
          Page {page} of {pages}
        </p>
      ) : null}
    </div>
  );
}

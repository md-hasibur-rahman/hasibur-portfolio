import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { LinksPanel } from "@/components/dashboard/links-panel";
import { ToolPageHeader } from "@/components/dashboard/tool-page-header";
import { listShortLinks } from "@/lib/shortlinks/service";

export const metadata: Metadata = { title: "Short links" };

export default async function LinksToolPage() {
  await requireAdmin();
  const links = await listShortLinks();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div className="flex flex-col gap-6">
      <ToolPageHeader
        description="Every /s/<code> redirect lives here — create, edit, follow clicks, or send one to the QR studio."
        title="Short links"
      />
      <LinksPanel appUrl={appUrl} links={links} />
    </div>
  );
}

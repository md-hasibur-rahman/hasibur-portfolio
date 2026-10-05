import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { QrPanel } from "@/components/dashboard/qr-panel";
import { ToolPageHeader } from "@/components/dashboard/tool-page-header";

export const metadata: Metadata = { title: "QR studio" };

export default async function QrToolPage({
  searchParams,
}: {
  searchParams: Promise<{ value?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const initialValue = typeof params.value === "string" ? params.value.slice(0, 800) : "";

  return (
    <div className="flex flex-col gap-6">
      <ToolPageHeader
        description="The code is drawn in your browser — nothing is uploaded. Every option below is baked into the exported PNG or SVG."
        title="QR studio"
      />
      <QrPanel initialValue={initialValue} />
    </div>
  );
}

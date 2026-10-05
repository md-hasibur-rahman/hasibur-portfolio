import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth/guards";
import { listAuditEvents } from "@/lib/queries/audit";

export const metadata: Metadata = { title: "Audit log" };

function stamp(value: Date) {
  return value.toISOString().slice(0, 19).replace("T", " ");
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; action?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const { items, total, page, pageSize } = await listAuditEvents({
    ...(params.search ? { search: params.search } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.page ? { page: params.page } : {}),
  });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-rise flex flex-col gap-2">
        <p className="eyebrow">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          {total} event{total === 1 ? "" : "s"} · password, token, secret and cookie fields are
          redacted before they are ever written
        </p>
      </header>

      <form action="/dashboard/audit" className="flex flex-wrap items-center gap-3">
        <Input className="w-44" defaultValue={params.action ?? ""} name="action" placeholder="Action" />
        <Input className="w-44" defaultValue={params.search ?? ""} name="search" placeholder="Search action, resource or id" />
        <Input className="w-40" defaultValue={params.from ?? ""} name="from" placeholder="From (YYYY-MM-DD)" />
        <Input className="w-40" defaultValue={params.to ?? ""} name="to" placeholder="To (YYYY-MM-DD)" />
        <Button size="sm" type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="animate-rise-soft overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated">
        <p className="border-b border-border/70 bg-muted/50 px-5 py-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
          When (UTC) · event
        </p>
        <ol className="divide-y divide-border/70">
          {items.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:gap-5"
            >
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:w-36 sm:pt-0.5">
                {stamp(event.createdAt)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{event.action}</span>
                  <Badge variant={event.status === "FAILURE" ? "destructive" : "outline"}>
                    {event.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {event.user ? `${event.user.email} (${event.user.role.toLowerCase()})` : "system/anonymous"}
                  {" · "}
                  {event.resource}
                  {event.resourceId ? (
                    <span className="font-mono"> #{event.resourceId.slice(-6)}</span>
                  ) : null}
                </p>
                {event.metadata ? (
                  <p className="truncate font-mono text-xs text-muted-foreground/80">
                    {JSON.stringify(event.metadata)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="px-5 py-8 text-sm text-muted-foreground">
              Nothing recorded for this filter yet.
            </li>
          ) : null}
        </ol>
      </div>

      {pages > 1 ? (
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          Page {page} of {pages}
        </p>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listConversations } from "@/lib/messaging/threads";

export const metadata: Metadata = { title: "Messages" };

function href(page: number, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/dashboard/messages?${query}` : "/dashboard/messages";
}

const chipBase =
  "rounded-full px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] transition-colors";
const chipOn = "bg-navy-950 text-navy-50 dark:bg-navy-100 dark:text-navy-950";
const chipOff = "bg-card text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; unread?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filters = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.unread === "1" ? { unreadOnly: true } : {}),
    ...(params.page ? { page: params.page } : {}),
  };

  // conversationFilterSchema rejects anything else with a validation error, so unknown query
  // strings cannot reach the Prisma where clause.
  const { items, total, page, pageSize } = await listConversations(filters);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const chips: [label: string, target: string, selected: boolean][] = [
    ["All", "/dashboard/messages", !params.status && params.unread !== "1"],
    ["Unread", "/dashboard/messages?unread=1", params.unread === "1"],
    ["Open", "/dashboard/messages?status=OPEN", params.status === "OPEN"],
    ["Closed", "/dashboard/messages?status=CLOSED", params.status === "CLOSED"],
    ["Archived", "/dashboard/messages?status=ARCHIVED", params.status === "ARCHIVED"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow">Inbox</p>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">{total} thread{total === 1 ? "" : "s"}</p>
        </div>
        <form className="flex gap-2" action="/dashboard/messages">
          <Input
            className="w-56"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Search subject, name or email"
            maxLength={120}
          />
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            Search
          </Button>
        </form>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filter threads">
        {chips.map(([label, target, selected]) => (
          <Link
            key={label}
            href={target}
            aria-current={selected ? "true" : undefined}
            className={`${chipBase} ${selected ? chipOn : chipOff}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Messages sent through /contact appear in this list.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated">
          <div className="hidden items-center justify-between gap-4 bg-muted/50 px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground sm:flex">
            <span>Thread</span>
            <span>Last message</span>
          </div>
          <ul className="divide-y divide-border/70">
            {items.map((thread) => (
              <li key={thread.id}>
                <Link
                  href={`/dashboard/messages/${thread.id}`}
                  className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      {thread._count.messages > 0 ? (
                        <Badge variant="secondary">{thread._count.messages} unread</Badge>
                      ) : null}
                      <span className="truncate text-sm font-medium">{thread.subject}</span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {thread.visitorName ?? "Visitor"} &lt;{thread.visitorEmail ?? "no address"}&gt;
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[0.68rem] text-muted-foreground">
                    {thread.lastMessageAt.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pages > 1 ? (
        <nav className="flex items-center gap-4 text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              href={href(page - 1, params)}
            >
              <ArrowLeftIcon className="size-3.5" />
              Previous
            </Link>
          ) : null}
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              href={href(page + 1, params)}
            >
              Next
              <ArrowRightIcon className="size-3.5" />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

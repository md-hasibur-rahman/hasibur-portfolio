import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReplyForm, ThreadStatusForm } from "@/components/dashboard/thread-controls";
import { requireAdmin } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";
import { openThread } from "@/lib/messaging/threads";

export const metadata: Metadata = { title: "Thread" };

const statusVariant: Record<"OPEN" | "CLOSED" | "ARCHIVED", "secondary" | "outline" | "destructive"> = {
  OPEN: "secondary",
  CLOSED: "outline",
  ARCHIVED: "destructive",
};

function stamp(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  let thread;
  try {
    thread = await openThread(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link
          className="eyebrow inline-flex w-fit items-center gap-1.5 rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          href="/dashboard/messages"
        >
          <ArrowLeftIcon className="size-3" />
          All messages
        </Link>
        <span className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{thread.subject}</h1>
          <Badge variant={statusVariant[thread.status]}>
            {thread.status.toLowerCase()}
          </Badge>
        </span>
        <p className="text-sm text-muted-foreground">
          {thread.visitorName ?? "Visitor"} &lt;{thread.visitorEmail ?? "no address on file"}&gt; ·
          started {stamp(thread.createdAt)}
        </p>
        <ThreadStatusForm conversationId={thread.id} status={thread.status} />
      </header>

      <ol className="flex flex-col gap-4">
        {thread.messages.map((message) => {
          const fromOwner = message.senderId !== null;
          return (
            <li
              key={message.id}
              className={
                fromOwner
                  ? "ml-auto max-w-prose rounded-2xl rounded-br-md bg-navy-950 p-4 text-navy-50 shadow-elevated dark:bg-navy-100 dark:text-navy-950"
                  : "max-w-prose rounded-2xl rounded-bl-md bg-card p-4 shadow-elevated ring-1 ring-foreground/8"
              }
            >
              <p
                className={
                  fromOwner
                    ? "font-mono text-[0.66rem] uppercase tracking-[0.14em] opacity-70"
                    : "font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted-foreground"
                }
              >
                {fromOwner ? (message.sender?.name ?? "Owner") : (thread.visitorName ?? "Visitor")}
                {" · "}
                {stamp(message.createdAt)}
                {fromOwner || message.readAt ? "" : " · unread"}
              </p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{message.body}</p>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow">Reply</h2>
        <ReplyForm conversationId={thread.id} />
      </section>
    </div>
  );
}

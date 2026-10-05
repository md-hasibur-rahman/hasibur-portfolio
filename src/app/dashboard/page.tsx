import type { Metadata } from "next";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardOverviewPage() {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const [unread, threads, published, drafts, assets, auditsToday] = await Promise.all([
    db.message.count({ where: { readAt: null, senderId: null } }),
    db.conversation.count(),
    db.project.count({ where: { status: "PUBLISHED" } }),
    db.project.count({ where: { status: { not: "PUBLISHED" } } }),
    db.asset.count(),
    db.auditLog.count({ where: { createdAt: { gt: midnight } } }),
  ]);

  const stats = [
    ["Unread visitor messages", unread],
    ["Threads", threads],
    ["Published projects", published],
    ["Draft or archived projects", drafts],
    ["Stored media", assets],
    ["Audit entries (today)", auditsToday],
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <header className="animate-rise flex flex-col gap-2">
        <p className="eyebrow">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Counts come straight from the database on every request — nothing here is cached or
          estimated.
        </p>
      </header>

      <dl className="animate-rise-soft grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-card p-5 shadow-elevated ring-1 ring-foreground/8"
          >
            <dt className="eyebrow">{label}</dt>
            <dd className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

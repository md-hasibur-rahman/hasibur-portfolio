import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserStatusButton } from "@/components/dashboard/user-status-button";
import { requireAdmin } from "@/lib/auth/guards";
import { listUsers } from "@/lib/users/service";

export const metadata: Metadata = { title: "Users" };

function stamp(value: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace("T", " ") : "—";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const [rows, total, blocked] = await listUsers({
    ...(params.search ? { search: params.search } : {}),
    ...(params.page ? { page: params.page } : {}),
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm tabular-nums text-muted-foreground">
            {total} account{total === 1 ? "" : "s"} · {blocked} blocked
          </p>
        </div>
        <form className="flex gap-2" action="/dashboard/users">
          <Input
            className="w-56"
            defaultValue={params.search ?? ""}
            maxLength={120}
            name="search"
            placeholder="Search name, email or username"
          />
          <Button size="sm" type="submit" variant="outline">
            Search
          </Button>
        </form>
      </header>

      <div className="animate-rise-soft overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium" scope="col">Account</th>
                <th className="px-5 py-3 font-medium" scope="col">Role</th>
                <th className="px-5 py-3 font-medium" scope="col">Live sessions</th>
                <th className="px-5 py-3 font-medium" scope="col">Last login</th>
                <th className="px-5 py-3 font-medium" scope="col">Status</th>
                <th className="px-5 py-3" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((row) => (
                <tr className="transition-colors hover:bg-muted/40" key={row.id}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{row.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      @{row.username} · {row.email}
                      {row.emailVerified ? " · verified" : " · not verified"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={row.role === "ADMIN" ? "secondary" : "outline"}>
                      {row.role.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums">{row._count.sessions}</td>
                  <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {stamp(row.lastLoginAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    {row.blockedAt ? (
                      <span className="flex items-center gap-2">
                        <Badge variant="destructive">blocked</Badge>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {stamp(row.blockedAt)}
                        </span>
                      </span>
                    ) : (
                      <Badge variant="secondary">active</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {row.id === admin.id ? (
                      <span className="text-xs text-muted-foreground">this is you</span>
                    ) : (
                      <UserStatusButton
                        blocked={Boolean(row.blockedAt)}
                        label={row.email}
                        userId={row.id}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-muted-foreground" colSpan={6}>
                    No accounts match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReauthGate } from "@/components/dashboard/reauth-gate";
import { VaultPanel } from "@/components/dashboard/vault-panel";
import { requireVaultAccess } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";
import { listVaultCategories, listVaultItems, vaultConfigured } from "@/lib/vault/service";

export const metadata: Metadata = { title: "Vault" };

const chipBase =
  "rounded-full px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] transition-colors";
const chipOn = "bg-navy-950 text-navy-50 dark:bg-navy-100 dark:text-navy-950";
const chipOff = "bg-card text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground";

function vaultHref(params: { search?: string; category?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.category) qs.set("category", params.category);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const query = qs.toString();
  return query ? `/dashboard/vault?${query}` : "/dashboard/vault";
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; page?: string }>;
}) {
  let admin;
  try {
    admin = await requireVaultAccess();
  } catch (error) {
    if (error instanceof AppError && error.code === "REAUTH_REQUIRED") {
      return (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1.5">
            <p className="eyebrow">Security</p>
            <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
          </header>
          <ReauthGate callbackUrl="/dashboard/vault" />
        </div>
      );
    }
    throw error;
  }

  const params = await searchParams;

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="eyebrow">Security</p>
        <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
        <p className="text-sm text-muted-foreground">
          Encrypted logins — passwords and notes are revealed one field at a time.
        </p>
      </div>
      <form className="flex gap-2" action="/dashboard/vault">
        {params.category ? <input name="category" type="hidden" value={params.category} /> : null}
        <Input
          className="w-56"
          defaultValue={params.search ?? ""}
          maxLength={120}
          name="search"
          placeholder="Search title, username or URL"
        />
        <Button type="submit" variant="outline">
          <SearchIcon data-icon="inline-start" />
          Search
        </Button>
      </form>
    </header>
  );

  if (!vaultConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Vault encryption key is not configured</CardTitle>
            <CardDescription>
              Add VAULT_ENCRYPTION_KEY to .env and restart the server. Everything stored here is
              encrypted with AES-256-GCM using that key — the key itself never touches the
              database.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Generate a 32-byte key once, keep it somewhere safe, and paste it into .env. Losing
              the key makes stored secrets unreadable.
            </p>
            <code className="overflow-x-auto rounded-xl bg-muted px-3.5 py-3 font-mono text-xs">
              node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;
            </code>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ rows, total, page, pageSize }, categories] = await Promise.all([
    listVaultItems(admin.id, {
      ...(params.search ? { search: params.search } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.page ? { page: params.page } : {}),
    }),
    listVaultCategories(admin.id),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      {header}

      {categories.length > 0 ? (
        <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
          <Link
            aria-current={!params.category ? "true" : undefined}
            className={`${chipBase} ${!params.category ? chipOn : chipOff}`}
            href={vaultHref({ search: params.search })}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              aria-current={params.category === category ? "true" : undefined}
              className={`${chipBase} ${params.category === category ? chipOn : chipOff}`}
              href={vaultHref({ search: params.search, category })}
              key={category}
            >
              {category}
            </Link>
          ))}
        </nav>
      ) : null}

      <VaultPanel categories={categories} items={rows} total={total} />

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center gap-3">
          {page > 1 ? (
            <Button asChild size="sm" variant="outline">
              <Link href={vaultHref({ search: params.search, category: params.category, page: page - 1 })}>
                ← Newer
              </Link>
            </Button>
          ) : null}
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button asChild size="sm" variant="outline">
              <Link href={vaultHref({ search: params.search, category: params.category, page: page + 1 })}>
                Older →
              </Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage } from "@/components/auth/form-parts";
import { ReauthGate } from "@/components/dashboard/reauth-gate";
import {
  createVaultItemAction,
  deleteVaultItemAction,
  revealVaultItemAction,
  updateVaultItemAction,
} from "@/lib/vault/actions";
import type { VaultItemRow } from "@/lib/vault/service";
import type { FieldErrors } from "@/lib/action-result";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function chipClass() {
  return "flex items-center gap-1 rounded-full bg-navy-950/5 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-foreground/10 dark:bg-navy-50/10";
}

function CategoryOptions({ categories, id }: { categories: string[]; id: string }) {
  if (categories.length === 0) return null;
  return (
    <datalist id={id}>
      {categories.map((category) => (
        <option key={category} value={category} />
      ))}
    </datalist>
  );
}

export function VaultPanel({
  items,
  total,
  categories,
}: {
  items: VaultItemRow[];
  total: number;
  categories: string[];
}) {
  const [stale, setStale] = useState(false);
  const onStale = () => setStale(true);

  if (stale) return <ReauthGate callbackUrl="/dashboard/vault" />;

  return (
    <div className="flex flex-col gap-6">
      <CreateItemCard categories={categories} onStale={onStale} />

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
          {total} entr{total === 1 ? "y" : "ies"}
        </h2>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
            Nothing stored yet — add the first login above.
          </p>
        ) : (
          items.map((item) => <VaultItemCard item={item} key={item.id} onStale={onStale} />)
        )}
      </section>
    </div>
  );
}

function CreateItemCard({
  categories,
  onStale,
}: {
  categories: string[];
  onStale: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>();
  const [message, setMessage] = useState<string>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const get = (name: string) => String(form.get(name) ?? "");

    setErrors(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await createVaultItemAction({
        title: get("title"),
        username: get("username"),
        password: get("password"),
        url: get("url"),
        category: get("category") || "Other",
        notes: get("notes"),
      });
      if (result.ok) {
        toast.success("Entry saved.");
        element.reset();
        router.refresh();
      } else if (result.code === "REAUTH_REQUIRED") {
        onStale();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New vault entry</CardTitle>
        <CardDescription>
          Password and notes are encrypted with AES-256-GCM before they touch the database — they
          are never listed back, only revealed one field at a time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="vault-title" label="Title" errors={errors?.title}>
              <Input
                id="vault-title"
                maxLength={120}
                name="title"
                placeholder="e.g. Neon database"
                required
              />
            </Field>

            <Field id="vault-category" label="Category" errors={errors?.category}>
              <Input
                defaultValue="Other"
                id="vault-category"
                list="vault-category-options"
                maxLength={60}
                name="category"
              />
              <CategoryOptions categories={categories} id="vault-category-options" />
            </Field>

            <Field id="vault-username" label="Username (optional)" errors={errors?.username}>
              <Input
                autoComplete="off"
                id="vault-username"
                maxLength={160}
                name="username"
                placeholder="user@example.com"
              />
            </Field>

            <Field id="vault-password" label="Password (optional)" errors={errors?.password}>
              <Input
                autoComplete="new-password"
                id="vault-password"
                maxLength={512}
                name="password"
                type="password"
              />
            </Field>
          </div>

          <Field id="vault-url" label="URL (optional)" errors={errors?.url}>
            <Input
              id="vault-url"
              maxLength={500}
              name="url"
              placeholder="https://console.example.com"
              type="url"
            />
          </Field>

          <Field id="vault-notes" label="Notes (optional)" errors={errors?.notes}>
            <Textarea id="vault-notes" maxLength={5000} name="notes" rows={3} />
          </Field>

          <FormMessage message={message} />

          <div>
            <Button disabled={pending} type="submit">
              <PlusIcon data-icon="inline-start" />
              Save entry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VaultItemCard({
  item,
  onStale,
}: {
  item: VaultItemRow;
  onStale: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<{ password?: string; notes?: string }>({});

  // Revealed plaintext lives only in this state: it re-locks after 30 seconds and is never
  // part of the server-rendered HTML.
  const hasRevealed = revealed.password !== undefined || revealed.notes !== undefined;
  useEffect(() => {
    if (!hasRevealed) return;
    const timer = setTimeout(() => setRevealed({}), 30_000);
    return () => clearTimeout(timer);
  }, [hasRevealed, revealed]);

  function hide(field: "password" | "notes") {
    setRevealed((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function toggle(field: "password" | "notes") {
    if (revealed[field] !== undefined) {
      hide(field);
      return;
    }
    startTransition(async () => {
      const result = await revealVaultItemAction({ id: item.id, field });
      if (result.ok) {
        const value = result.reveal.value;
        setRevealed((current) => (field === "password" ? { ...current, password: value } : { ...current, notes: value }));
      } else if (result.code === "REAUTH_REQUIRED") {
        onStale();
      } else {
        toast.error(result.message);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteVaultItemAction({ id: item.id });
      setConfirming(false);
      if (result.ok) {
        toast.success(result.message ?? "Entry deleted.");
        router.refresh();
      } else if (result.code === "REAUTH_REQUIRED") {
        onStale();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-elevated">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{item.title}</h3>
            <span className={chipClass()}>{item.category}</span>
            {item.hasPassword ? (
              <span className={chipClass()}>
                <LockIcon className="size-3" />
                password
              </span>
            ) : null}
            {item.hasNotes ? (
              <span className={chipClass()}>
                <FileTextIcon className="size-3" />
                notes
              </span>
            ) : null}
          </div>

          {item.username ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserIcon className="size-3.5 shrink-0" />
              <span className="truncate">{item.username}</span>
            </p>
          ) : null}
          {item.url ? (
            <a
              className="flex items-center gap-1.5 text-xs text-foreground underline-offset-4 hover:underline"
              href={item.url}
              rel="noreferrer"
              target="_blank"
            >
              <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.url}</span>
              <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
            </a>
          ) : null}
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Updated {formatDate(item.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.hasPassword ? (
            <Button disabled={pending} onClick={() => toggle("password")} size="sm" variant="outline">
              {revealed.password !== undefined ? (
                <EyeOffIcon data-icon="inline-start" />
              ) : (
                <EyeIcon data-icon="inline-start" />
              )}
              {revealed.password !== undefined ? "Hide password" : "Reveal password"}
            </Button>
          ) : null}
          {item.hasNotes ? (
            <Button disabled={pending} onClick={() => toggle("notes")} size="sm" variant="outline">
              {revealed.notes !== undefined ? (
                <EyeOffIcon data-icon="inline-start" />
              ) : (
                <EyeIcon data-icon="inline-start" />
              )}
              {revealed.notes !== undefined ? "Hide notes" : "Reveal notes"}
            </Button>
          ) : null}
          <Button onClick={() => setEditing((current) => !current)} size="sm" variant="outline">
            <PencilIcon data-icon="inline-start" />
            {editing ? "Close" : "Edit"}
          </Button>
          <Button onClick={() => setConfirming(true)} size="sm" variant="outline">
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      {revealed.password !== undefined ? (
        <RevealedValue label="Password" onHide={() => hide("password")} value={revealed.password} />
      ) : null}
      {revealed.notes !== undefined ? (
        <RevealedValue label="Notes" onHide={() => hide("notes")} value={revealed.notes} />
      ) : null}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 p-3">
          <span className="text-xs text-muted-foreground">
            Delete “{item.title}”? The encrypted value goes with it and cannot be recovered.
          </span>
          <Button disabled={pending} onClick={remove} size="sm" variant="destructive">
            Confirm delete
          </Button>
          <Button disabled={pending} onClick={() => setConfirming(false)} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      ) : null}

      {editing ? (
        <VaultEditForm item={item} onDone={() => setEditing(false)} onStale={onStale} />
      ) : null}
    </article>
  );
}

function RevealedValue({
  label,
  value,
  onHide,
}: {
  label: string;
  value: string;
  onHide: () => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied — clear your clipboard when you are done.");
    } catch {
      toast.error("Clipboard is blocked in this browser.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/25 p-3">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <code className="break-all font-mono text-sm">{value}</code>
      <div className="flex gap-2">
        <Button onClick={copy} size="sm" variant="outline">
          <CopyIcon data-icon="inline-start" />
          Copy
        </Button>
        <Button onClick={onHide} size="sm" variant="ghost">
          <EyeOffIcon data-icon="inline-start" />
          Hide
        </Button>
      </div>
    </div>
  );
}

function VaultEditForm({
  item,
  onDone,
  onStale,
}: {
  item: VaultItemRow;
  onDone: () => void;
  onStale: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>();
  const [message, setMessage] = useState<string>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");

    setErrors(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateVaultItemAction({
        id: item.id,
        title: get("title"),
        username: get("username"),
        password: get("password"),
        url: get("url"),
        category: get("category") || "Other",
        notes: get("notes"),
      });
      if (result.ok) {
        toast.success("Entry updated.");
        onDone();
        router.refresh();
      } else if (result.code === "REAUTH_REQUIRED") {
        onStale();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <form
      className="grid gap-4 rounded-xl border border-border/70 bg-muted/25 p-4"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`edit-vault-title-${item.id}`} label="Title" errors={errors?.title}>
          <Input
            defaultValue={item.title}
            id={`edit-vault-title-${item.id}`}
            maxLength={120}
            name="title"
            required
          />
        </Field>

        <Field id={`edit-vault-category-${item.id}`} label="Category" errors={errors?.category}>
          <Input
            defaultValue={item.category}
            id={`edit-vault-category-${item.id}`}
            list="vault-category-options"
            maxLength={60}
            name="category"
          />
        </Field>

        <Field
          id={`edit-vault-username-${item.id}`}
          label="Username (optional)"
          errors={errors?.username}
        >
          <Input
            autoComplete="off"
            defaultValue={item.username ?? ""}
            id={`edit-vault-username-${item.id}`}
            maxLength={160}
            name="username"
          />
        </Field>

        <Field
          id={`edit-vault-password-${item.id}`}
          label="Password"
          errors={errors?.password}
        >
          <Input
            autoComplete="new-password"
            id={`edit-vault-password-${item.id}`}
            maxLength={512}
            name="password"
            placeholder={
              item.hasPassword ? "Leave blank to keep the saved password" : "No password stored yet"
            }
            type="password"
          />
        </Field>
      </div>

      <Field id={`edit-vault-url-${item.id}`} label="URL (optional)" errors={errors?.url}>
        <Input
          defaultValue={item.url ?? ""}
          id={`edit-vault-url-${item.id}`}
          maxLength={500}
          name="url"
          type="url"
        />
      </Field>

      <Field id={`edit-vault-notes-${item.id}`} label="Notes" errors={errors?.notes}>
        <Textarea
          id={`edit-vault-notes-${item.id}`}
          maxLength={5000}
          name="notes"
          placeholder={item.hasNotes ? "Leave blank to keep the saved notes" : "No notes stored yet"}
          rows={3}
        />
      </Field>

      <FormMessage message={message} />

      <div className="flex gap-2">
        <Button disabled={pending} size="sm" type="submit">
          Save changes
        </Button>
        <Button disabled={pending} onClick={onDone} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}

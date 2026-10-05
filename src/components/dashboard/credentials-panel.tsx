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
  KeyRoundIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage } from "@/components/auth/form-parts";
import { ReauthGate } from "@/components/dashboard/reauth-gate";
import {
  createCredentialAction,
  deleteCredentialAction,
  revealCredentialAction,
  updateCredentialAction,
} from "@/lib/vault/actions";
import type { CredentialRow } from "@/lib/vault/service";
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

export function CredentialsPanel({
  items,
  total,
}: {
  items: CredentialRow[];
  total: number;
}) {
  const [stale, setStale] = useState(false);
  const onStale = () => setStale(true);

  if (stale) return <ReauthGate callbackUrl="/dashboard/credentials" />;

  return (
    <div className="flex flex-col gap-6">
      <CreateCredentialCard onStale={onStale} />

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
          {total} credential{total === 1 ? "" : "s"}
        </h2>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
            Nothing stored yet — add the first API credential above.
          </p>
        ) : (
          items.map((credential) => (
            <CredentialCard credential={credential} key={credential.id} onStale={onStale} />
          ))
        )}
      </section>
    </div>
  );
}

function CreateCredentialCard({ onStale }: { onStale: () => void }) {
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
      const result = await createCredentialAction({
        name: get("name"),
        service: get("service"),
        apiKey: get("apiKey"),
        apiSecret: get("apiSecret"),
        baseUrl: get("baseUrl"),
        notes: get("notes"),
      });
      if (result.ok) {
        toast.success("Credential saved.");
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
        <CardTitle>New API credential</CardTitle>
        <CardDescription>
          Key and secret are encrypted with AES-256-GCM before they touch the database — they are
          never listed back, only revealed one field at a time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="cred-name" label="Name" errors={errors?.name}>
              <Input
                id="cred-name"
                maxLength={120}
                name="name"
                placeholder="e.g. Render deploy key"
                required
              />
            </Field>

            <Field id="cred-service" label="Service" errors={errors?.service}>
              <Input
                id="cred-service"
                maxLength={80}
                name="service"
                placeholder="e.g. Render, Cloudinary, Neon"
                required
              />
            </Field>

            <Field id="cred-key" label="API key (optional)" errors={errors?.apiKey}>
              <Input
                autoComplete="off"
                id="cred-key"
                maxLength={1000}
                name="apiKey"
                type="password"
              />
            </Field>

            <Field id="cred-secret" label="API secret (optional)" errors={errors?.apiSecret}>
              <Input
                autoComplete="new-password"
                id="cred-secret"
                maxLength={1000}
                name="apiSecret"
                type="password"
              />
            </Field>
          </div>

          <Field id="cred-base-url" label="Base URL (optional)" errors={errors?.baseUrl}>
            <Input
              id="cred-base-url"
              maxLength={500}
              name="baseUrl"
              placeholder="https://api.example.com"
              type="url"
            />
          </Field>

          <Field id="cred-notes" label="Notes (optional)" errors={errors?.notes}>
            <Textarea id="cred-notes" maxLength={2000} name="notes" rows={3} />
          </Field>

          <FormMessage message={message} />

          <div>
            <Button disabled={pending} type="submit">
              <PlusIcon data-icon="inline-start" />
              Save credential
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CredentialCard({
  credential,
  onStale,
}: {
  credential: CredentialRow;
  onStale: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<{ apiKey?: string; apiSecret?: string }>({});

  // Revealed plaintext lives only in this state: it re-locks after 30 seconds and is never
  // part of the server-rendered HTML.
  const hasRevealed = revealed.apiKey !== undefined || revealed.apiSecret !== undefined;
  useEffect(() => {
    if (!hasRevealed) return;
    const timer = setTimeout(() => setRevealed({}), 30_000);
    return () => clearTimeout(timer);
  }, [hasRevealed, revealed]);

  function hide(field: "apiKey" | "apiSecret") {
    setRevealed((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function toggle(field: "apiKey" | "apiSecret") {
    if (revealed[field] !== undefined) {
      hide(field);
      return;
    }
    startTransition(async () => {
      const result = await revealCredentialAction({ id: credential.id, field });
      if (result.ok) {
        const value = result.reveal.value;
        setRevealed((current) =>
          field === "apiKey" ? { ...current, apiKey: value } : { ...current, apiSecret: value },
        );
      } else if (result.code === "REAUTH_REQUIRED") {
        onStale();
      } else {
        toast.error(result.message);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCredentialAction({ id: credential.id });
      setConfirming(false);
      if (result.ok) {
        toast.success(result.message ?? "Credential deleted.");
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
            <h3 className="text-sm font-medium">{credential.name}</h3>
            <span className={chipClass()}>
              <ServerIcon className="size-3" />
              {credential.service}
            </span>
            {credential.hasKey ? (
              <span className={chipClass()}>
                <KeyRoundIcon className="size-3" />
                key
              </span>
            ) : null}
            {credential.hasSecret ? (
              <span className={chipClass()}>
                <LockIcon className="size-3" />
                secret
              </span>
            ) : null}
            {credential.notes ? (
              <span className={chipClass()}>
                <FileTextIcon className="size-3" />
                notes
              </span>
            ) : null}
          </div>

          {credential.baseUrl ? (
            <a
              className="flex items-center gap-1.5 text-xs text-foreground underline-offset-4 hover:underline"
              href={credential.baseUrl}
              rel="noreferrer"
              target="_blank"
            >
              <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{credential.baseUrl}</span>
              <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
            </a>
          ) : null}
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Updated {formatDate(credential.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {credential.hasKey ? (
            <Button disabled={pending} onClick={() => toggle("apiKey")} size="sm" variant="outline">
              {revealed.apiKey !== undefined ? (
                <EyeOffIcon data-icon="inline-start" />
              ) : (
                <EyeIcon data-icon="inline-start" />
              )}
              {revealed.apiKey !== undefined ? "Hide key" : "Reveal key"}
            </Button>
          ) : null}
          {credential.hasSecret ? (
            <Button
              disabled={pending}
              onClick={() => toggle("apiSecret")}
              size="sm"
              variant="outline"
            >
              {revealed.apiSecret !== undefined ? (
                <EyeOffIcon data-icon="inline-start" />
              ) : (
                <EyeIcon data-icon="inline-start" />
              )}
              {revealed.apiSecret !== undefined ? "Hide secret" : "Reveal secret"}
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

      {revealed.apiKey !== undefined ? (
        <RevealedValue label="API key" onHide={() => hide("apiKey")} value={revealed.apiKey} />
      ) : null}
      {revealed.apiSecret !== undefined ? (
        <RevealedValue
          label="API secret"
          onHide={() => hide("apiSecret")}
          value={revealed.apiSecret}
        />
      ) : null}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 p-3">
          <span className="text-xs text-muted-foreground">
            Delete “{credential.name}”? The encrypted value goes with it and cannot be recovered.
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
        <CredentialEditForm
          credential={credential}
          onDone={() => setEditing(false)}
          onStale={onStale}
        />
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

function CredentialEditForm({
  credential,
  onDone,
  onStale,
}: {
  credential: CredentialRow;
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
      const result = await updateCredentialAction({
        id: credential.id,
        name: get("name"),
        service: get("service"),
        apiKey: get("apiKey"),
        apiSecret: get("apiSecret"),
        baseUrl: get("baseUrl"),
        notes: get("notes"),
      });
      if (result.ok) {
        toast.success("Credential updated.");
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
        <Field id={`edit-cred-name-${credential.id}`} label="Name" errors={errors?.name}>
          <Input
            defaultValue={credential.name}
            id={`edit-cred-name-${credential.id}`}
            maxLength={120}
            name="name"
            required
          />
        </Field>

        <Field id={`edit-cred-service-${credential.id}`} label="Service" errors={errors?.service}>
          <Input
            defaultValue={credential.service}
            id={`edit-cred-service-${credential.id}`}
            maxLength={80}
            name="service"
            required
          />
        </Field>

        <Field id={`edit-cred-key-${credential.id}`} label="API key" errors={errors?.apiKey}>
          <Input
            autoComplete="off"
            id={`edit-cred-key-${credential.id}`}
            maxLength={1000}
            name="apiKey"
            placeholder={credential.hasKey ? "Leave blank to keep the saved key" : "No key stored yet"}
            type="password"
          />
        </Field>

        <Field
          id={`edit-cred-secret-${credential.id}`}
          label="API secret"
          errors={errors?.apiSecret}
        >
          <Input
            autoComplete="new-password"
            id={`edit-cred-secret-${credential.id}`}
            maxLength={1000}
            name="apiSecret"
            placeholder={
              credential.hasSecret ? "Leave blank to keep the saved secret" : "No secret stored yet"
            }
            type="password"
          />
        </Field>
      </div>

      <Field id={`edit-cred-base-${credential.id}`} label="Base URL (optional)" errors={errors?.baseUrl}>
        <Input
          defaultValue={credential.baseUrl ?? ""}
          id={`edit-cred-base-${credential.id}`}
          maxLength={500}
          name="baseUrl"
          type="url"
        />
      </Field>

      <Field id={`edit-cred-notes-${credential.id}`} label="Notes (optional)" errors={errors?.notes}>
        <Textarea
          defaultValue={credential.notes ?? ""}
          id={`edit-cred-notes-${credential.id}`}
          maxLength={2000}
          name="notes"
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

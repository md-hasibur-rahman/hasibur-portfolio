"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CopyIcon,
  ExternalLinkIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FormMessage } from "@/components/auth/form-parts";
import {
  createShortLinkAction,
  deleteShortLinkAction,
  updateShortLinkAction,
} from "@/lib/shortlinks/actions";
import type { ShortLinkSummary } from "@/lib/shortlinks/service";
import type { FieldErrors } from "@/lib/action-result";

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-elevated outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 dark:bg-input/25";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LinksPanel({ links, appUrl }: { links: ShortLinkSummary[]; appUrl: string }) {
  return (
    <div className="flex flex-col gap-6">
      <CreateLinkCard />

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
          {links.length} short link{links.length === 1 ? "" : "s"}
        </h2>
        {links.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
            No short links yet — create the first one above.
          </p>
        ) : (
          links.map((link) => <LinkRow appUrl={appUrl} key={link.id} link={link} />)
        )}
      </section>
    </div>
  );
}

function CreateLinkCard() {
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
      const result = await createShortLinkAction({
        targetUrl: get("targetUrl"),
        slug: get("slug"),
        title: get("title"),
        password: get("password"),
      });
      if (result.ok) {
        toast.success(result.message ?? "Short link created.");
        element.reset();
        router.refresh();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New short link</CardTitle>
        <CardDescription>
          Point /s/&lt;code&gt; at any http(s) URL. Add a password to put a verification step in
          front of the redirect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={onSubmit}>
          <Field id="targetUrl" label="Target URL" errors={errors?.targetUrl}>
            <Input
              id="targetUrl"
              maxLength={2048}
              name="targetUrl"
              placeholder="https://example.com/page"
              required
              type="url"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="slug" label="Short code (optional)" errors={errors?.slug}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">/s/</span>
                <Input id="slug" maxLength={48} name="slug" placeholder="auto-generated" />
              </div>
            </Field>

            <Field id="title" label="Label (optional)" errors={errors?.title}>
              <Input id="title" maxLength={120} name="title" placeholder="Where this link is used" />
            </Field>
          </div>

          <Field id="password" label="Password (optional)" errors={errors?.password}>
            <Input
              autoComplete="new-password"
              id="password"
              maxLength={128}
              name="password"
              placeholder="At least 8 characters — leave empty for a public link"
              type="password"
            />
          </Field>

          <FormMessage message={message} />

          <div>
            <Button disabled={pending} type="submit">
              <PlusIcon data-icon="inline-start" />
              Create short link
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LinkRow({ link, appUrl }: { link: ShortLinkSummary; appUrl: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const shortPath = `/s/${link.slug}`;
  const shortUrl = `${appUrl}${shortPath}`;

  async function copy() {
    try {
      // The live origin beats a build-time APP_URL here: it also works on a LAN IP or a preview port.
      await navigator.clipboard.writeText(`${window.location.origin}${shortPath}`);
      toast.success("Short URL copied.");
    } catch {
      toast.error("Clipboard is blocked in this browser.");
    }
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteShortLinkAction({ id: link.id });
      setConfirming(false);
      if (result.ok) {
        toast.success(result.message ?? "Deleted.");
        router.refresh();
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
            <a
              className="font-mono text-sm text-foreground underline-offset-4 hover:underline"
              href={shortUrl}
              rel="noreferrer"
              target="_blank"
            >
              {shortPath}
            </a>
            {link.hasPassword ? (
              <span className="flex items-center gap-1 rounded-full bg-navy-950/5 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-foreground/10 dark:bg-navy-50/10">
                <LockIcon className="size-3" />
                password
              </span>
            ) : null}
            <span className="rounded-full bg-navy-950/5 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-foreground/10 dark:bg-navy-50/10">
              {link.clicks} click{link.clicks === 1 ? "" : "s"}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ExternalLinkIcon className="size-3.5 shrink-0" />
            <span className="truncate" title={link.targetUrl}>
              {link.targetUrl}
            </span>
          </p>
          {link.title ? <p className="text-xs text-foreground">{link.title}</p> : null}
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Added {formatDate(link.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} size="sm" variant="outline">
            <CopyIcon data-icon="inline-start" />
            Copy
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/tools/qr?value=${encodeURIComponent(shortUrl)}`}>
              <QrCodeIcon data-icon="inline-start" />
              QR
            </Link>
          </Button>
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

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 p-3">
          <span className="text-xs text-muted-foreground">
            Delete /s/{link.slug}? Anyone using it will hit a 404.
          </span>
          <Button disabled={pending} onClick={remove} size="sm" variant="destructive">
            Confirm delete
          </Button>
          <Button disabled={pending} onClick={() => setConfirming(false)} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      ) : null}

      {editing ? <LinkEditForm link={link} onDone={() => setEditing(false)} /> : null}
    </article>
  );
}

function LinkEditForm({ link, onDone }: { link: ShortLinkSummary; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>();
  const [message, setMessage] = useState<string>();
  const [passwordMode, setPasswordMode] = useState<"keep" | "set" | "remove">("keep");
  const [password, setPassword] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");

    setErrors(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateShortLinkAction({
        id: link.id,
        targetUrl: get("targetUrl"),
        slug: get("slug"),
        title: get("title"),
        ...(passwordMode === "set" ? { password } : {}),
        ...(passwordMode === "remove" ? { password: "" } : {}),
      });
      if (result.ok) {
        toast.success(result.message ?? "Updated.");
        onDone();
        router.refresh();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <form className="grid gap-4 rounded-xl border border-border/70 bg-muted/25 p-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`edit-target-${link.id}`} label="Target URL" errors={errors?.targetUrl}>
          <Input
            defaultValue={link.targetUrl}
            id={`edit-target-${link.id}`}
            maxLength={2048}
            name="targetUrl"
            required
            type="url"
          />
        </Field>

        <Field id={`edit-slug-${link.id}`} label="Short code" errors={errors?.slug}>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">/s/</span>
            <Input
              defaultValue={link.slug}
              id={`edit-slug-${link.id}`}
              maxLength={48}
              name="slug"
              required
            />
          </div>
        </Field>

        <Field id={`edit-title-${link.id}`} label="Label (optional)" errors={errors?.title}>
          <Input
            defaultValue={link.title ?? ""}
            id={`edit-title-${link.id}`}
            maxLength={120}
            name="title"
          />
        </Field>

        <div className="grid content-start gap-2">
          <Label htmlFor={`edit-password-mode-${link.id}`}>Password</Label>
          <select
            className={selectClass}
            id={`edit-password-mode-${link.id}`}
            onChange={(event) =>
              setPasswordMode(event.currentTarget.value as "keep" | "set" | "remove")
            }
            value={passwordMode}
          >
            <option value="keep">Keep current {link.hasPassword ? "(set)" : "(none)"}</option>
            <option value="set">Set a new password</option>
            <option value="remove">Remove password</option>
          </select>
          {passwordMode === "set" ? (
            <Input
              aria-label="New password"
              autoComplete="new-password"
              id={`edit-password-${link.id}`}
              maxLength={128}
              onChange={(event) => setPassword(event.currentTarget.value)}
              placeholder="At least 8 characters"
              type="password"
              value={password}
            />
          ) : null}
          {errors?.password ? <FormMessage message={errors.password.join(" ")} /> : null}
        </div>
      </div>

      <FormMessage message={message} />

      <div className="flex gap-2">
        <Button
          disabled={pending || (passwordMode === "set" && password.length < 8)}
          size="sm"
          type="submit"
        >
          Save changes
        </Button>
        <Button disabled={pending} onClick={onDone} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}

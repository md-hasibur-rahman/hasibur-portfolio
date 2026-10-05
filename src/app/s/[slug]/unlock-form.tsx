"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockShortLinkAction } from "@/lib/shortlinks/actions";

export function UnlockForm({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    startTransition(async () => {
      const result = await unlockShortLinkAction({ slug, password });
      if (result.ok) {
        // The destination is an external site, so a full navigation is the right move.
        window.location.assign(result.targetUrl);
        return;
      }
      setFieldError(result.fields?.password?.[0] ?? result.message);
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-navy-50/10 bg-card p-5 shadow-elevated"
      onSubmit={submit}
    >
      <div className="grid gap-2">
        <Label className="text-xs" htmlFor="unlock-password">
          Password
        </Label>
        <Input
          autoComplete="off"
          autoFocus
          disabled={pending}
          id="unlock-password"
          maxLength={128}
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="••••••••"
          type="password"
          value={password}
        />
        {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
      </div>
      <Button disabled={pending || password.length === 0} type="submit">
        {pending ? "Checking…" : "Unlock link"}
      </Button>
    </form>
  );
}

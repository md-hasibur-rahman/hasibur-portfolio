"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AuthCard, Field, FormMessage, SubmitButton, TextLink } from "@/components/auth/form-parts";
import { loginAction } from "@/lib/auth/actions";
import type { FieldErrors } from "@/lib/action-result";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(callbackUrl ? { redirectTo: callbackUrl } : {}),
    };

    setMessage(undefined);
    setErrors(undefined);
    startTransition(async () => {
      const result = await loginAction(payload);
      if (!result.ok) {
        setMessage(result.message);
        setErrors(result.fields);
        toast.error(result.message);
      }
      // A successful sign-in redirects from inside the server action.
    });
  }

  return (
    <AuthCard
      title="Sign in"
      description="Use your email and password."
      footer={
        <>
          No account? <TextLink href="/register">Create one</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field id="email" label="Email" errors={errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="password" label="Password" errors={errors?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormMessage message={message} />
        <SubmitButton pending={pending} label="Sign in" />
      </form>
      <p className="text-sm text-muted-foreground">
        <TextLink href="/forgot-password">Forgot your password?</TextLink>
      </p>
    </AuthCard>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AuthCard, Field, FormMessage, SubmitButton, TextLink } from "@/components/auth/form-parts";
import { registerAction } from "@/lib/auth/actions";
import type { FieldErrors } from "@/lib/action-result";

export function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    setMessage(undefined);
    setErrors(undefined);
    startTransition(async () => {
      const result = await registerAction(payload);
      if (result.ok) {
        setMessage(result.message);
        toast.success("Account created");
      } else {
        setMessage(result.message);
        setErrors(result.fields);
        toast.error(result.message);
      }
    });
  }

  return (
    <AuthCard
      title="Create an account"
      description="Registration always creates a standard user account."
      footer={
        <>
          Already registered? <TextLink href="/login">Sign in</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field id="name" label="Full name" errors={errors?.name}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field id="username" label="Username" errors={errors?.username}>
          <Input id="username" name="username" autoComplete="username" required />
        </Field>
        <Field id="email" label="Email" errors={errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="password" label="Password" errors={errors?.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          At least 12 characters with upper case, lower case and a number.
        </p>
        <FormMessage message={message} />
        <SubmitButton pending={pending} label="Create account" />
      </form>
    </AuthCard>
  );
}

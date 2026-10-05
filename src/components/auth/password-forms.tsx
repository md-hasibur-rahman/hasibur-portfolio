"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { forgotPasswordAction, resetPasswordAction } from "@/lib/auth/actions";
import type { FieldErrors } from "@/lib/action-result";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setMessage(undefined);
    setErrors(undefined);

    startTransition(async () => {
      const result = await forgotPasswordAction({ email });
      setMessage(result.ok ? result.message : result.message);
      if (!result.ok) setErrors(result.fields);
      if (result.ok) toast.success("Request received");
    });
  }

  return (
    <AuthCard title="Forgot password" description="We email a link to choose a new password.">
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field id="email" label="Email" errors={errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <FormMessage message={message} />
        <SubmitButton pending={pending} label="Send reset link" />
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();

  if (!token) {
    return (
      <AuthCard title="Reset password" description="This reset link is incomplete.">
        <FormMessage message="Open the reset link from your email again." />
      </AuthCard>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage(undefined);
    setErrors(undefined);

    startTransition(async () => {
      const result = await resetPasswordAction({
        token,
        password: String(form.get("password") ?? ""),
      });
      setMessage(result.message);
      if (!result.ok) setErrors(result.fields);
      if (result.ok) toast.success("Password updated");
    });
  }

  return (
    <AuthCard title="Choose a new password" description="Signing out all other sessions on submit.">
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field id="password" label="New password" errors={errors?.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
          />
        </Field>
        <FormMessage message={message} />
        <SubmitButton pending={pending} label="Update password" />
      </form>
    </AuthCard>
  );
}

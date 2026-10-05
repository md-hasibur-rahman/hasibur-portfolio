"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactAction } from "@/lib/messaging/actions";
import type { FieldErrors } from "@/lib/action-result";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      subject: String(form.get("subject") ?? ""),
      body: String(form.get("body") ?? ""),
      company: String(form.get("company") ?? ""),
    };

    setMessage(undefined);
    setErrors(undefined);

    startTransition(async () => {
      const result = await contactAction(payload);
      if (result.ok) {
        element.reset();
        setSent(true);
        toast.success(result.message ?? "Message sent.");
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" errors={errors?.name}>
          <Input id="name" name="name" autoComplete="name" required maxLength={100} />
        </Field>
        <Field id="email" label="Email" errors={errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
        </Field>
      </div>

      <Field id="subject" label="Subject" errors={errors?.subject}>
        <Input id="subject" name="subject" required maxLength={140} />
      </Field>

      <Field id="body" label="Message" errors={errors?.body}>
        <Textarea
          id="body"
          name="body"
          rows={6}
          required
          minLength={20}
          maxLength={8000}
          placeholder="What are you working on, and what do you need?"
        />
      </Field>

      {/* Honeypot. readOnly + the manager-ignore attributes keep browser autofill and password
          managers from filling an off-screen field; the service silently drops submissions that
          still arrive with it filled. */}
      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <Label htmlFor="company">Company website</Label>
        <Input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-bwignore
          data-lpignore="true"
          readOnly
        />
      </div>

      <FormMessage message={message} />

      <div className="flex items-center gap-4">
        <SubmitButton pending={pending} label="Send message" />
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Message received — it is in the owner&apos;s inbox now.
          </p>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { Textarea } from "@/components/ui/textarea";
import { replyAction, threadStatusAction } from "@/lib/messaging/actions";

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const body = String(form.get("body") ?? "");

    setMessage(undefined);
    setErrors(undefined);

    startTransition(async () => {
      const result = await replyAction({ conversationId, body });
      if (result.ok) {
        element.reset();
        toast.success(result.message ?? "Reply saved.");
        router.refresh();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="surface flex flex-col gap-5 p-5">
      <Field id="body" label="Reply" errors={errors?.body}>
        <Textarea id="body" name="body" rows={5} required maxLength={8000} />
      </Field>
      <FormMessage message={message} />
      <SubmitButton pending={pending} label="Send reply" />
    </form>
  );
}

export function ThreadStatusForm({
  conversationId,
  status,
}: {
  conversationId: string;
  status: "OPEN" | "CLOSED" | "ARCHIVED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.currentTarget.value as "OPEN" | "CLOSED" | "ARCHIVED";
    startTransition(async () => {
      const result = await threadStatusAction({ conversationId, status: next });
      if (result.ok) toast.success(result.message ?? "Thread updated.");
      else toast.error(result.message);
      router.refresh();
    });
  }

  return (
    <label className="flex w-fit items-center gap-3 text-sm">
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
        Status
      </span>
      <select
        className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm shadow-elevated outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-60 dark:bg-input/25"
        defaultValue={status}
        disabled={pending}
        name="status"
        onChange={onChange}
      >
        <option value="OPEN">Open</option>
        <option value="CLOSED">Closed</option>
        <option value="ARCHIVED">Archived</option>
      </select>
    </label>
  );
}

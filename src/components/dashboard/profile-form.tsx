"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { saveProfileAction } from "@/lib/profile/actions";
import type { FieldErrors } from "@/lib/action-result";

export type ProfileFormValues = {
  bio: string;
  location: string;
  website: string;
  githubUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
};

export function ProfileForm({ values }: { values: ProfileFormValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      bio: String(form.get("bio") ?? ""),
      location: String(form.get("location") ?? ""),
      website: String(form.get("website") ?? ""),
      githubUrl: String(form.get("githubUrl") ?? ""),
      linkedinUrl: String(form.get("linkedinUrl") ?? ""),
      twitterUrl: String(form.get("twitterUrl") ?? ""),
    };

    setMessage(undefined);
    setErrors(undefined);

    startTransition(async () => {
      const result = await saveProfileAction(payload);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        setMessage(result.message);
        setErrors(result.fields);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>
            These fields are what /about and the home page read. Blank stays blank on the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="bio" label="Bio" errors={errors?.bio}>
              <Textarea id="bio" name="bio" rows={6} maxLength={1000} defaultValue={values.bio} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field id="location" label="Location" errors={errors?.location}>
              <Input id="location" name="location" maxLength={120} defaultValue={values.location} />
            </Field>
          </div>

          {(
            [
              ["website", "Website"],
              ["githubUrl", "GitHub"],
              ["linkedinUrl", "LinkedIn"],
              ["twitterUrl", "Twitter"],
            ] as const
          ).map(([name, label]) => (
            <Field key={name} id={name} label={label} errors={errors?.[name]}>
              <Input
                id={name}
                name={name}
                type="url"
                placeholder="https://…"
                defaultValue={values[name]}
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      <FormMessage message={message} />
      <div>
        <SubmitButton label="Save profile" pending={pending} />
      </div>
    </form>
  );
}

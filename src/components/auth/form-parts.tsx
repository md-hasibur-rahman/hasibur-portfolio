"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircleIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="flex items-start gap-2.5 rounded-xl bg-destructive/8 px-3.5 py-3 text-sm text-destructive ring-1 ring-destructive/20"
      role="alert"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function Field({
  id,
  label,
  errors,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const invalid = Boolean(errors?.[0]);

  // The field owns the error state, so the control gets aria-invalid/aria-describedby
  // without every call site having to remember to wire them up.
  const control =
    invalid && React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
          "aria-invalid": true,
          "aria-describedby": errorId,
        })
      : children;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {control}
      {invalid ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive" id={errorId}>
          <AlertCircleIcon className="size-3.5 shrink-0" />
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="gap-6 py-7 sm:py-8">
      <CardHeader className="gap-3">
        <CardTitle asChild className="text-2xl tracking-[-0.02em]">
          <h1>{title}</h1>
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {children}
        {footer ? (
          <div className="border-t border-border/70 pt-5 text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button className="w-full" disabled={pending} size="lg" type="submit">
      {pending ? (
        <>
          <LoaderCircleIcon className="size-4 animate-spin" data-icon="inline-start" />
          Working…
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="link-underline font-medium text-foreground underline-offset-4"
      href={href}
    >
      {children}
    </Link>
  );
}

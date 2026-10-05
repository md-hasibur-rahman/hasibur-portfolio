import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmailToken } from "@/lib/auth/flows";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let result: { ok: true; email: string } | { ok: false; message: string };
  if (!token) {
    result = { ok: false, message: "This verification link is incomplete." };
  } else {
    try {
      const { email } = await verifyEmailToken(token);
      result = { ok: true, email };
    } catch (error) {
      result = {
        ok: false,
        message:
          error instanceof AppError && error.code === "NOT_FOUND"
            ? "This link is invalid, expired, or has already been used."
            : "We could not verify this address.",
      };
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{result.ok ? "Email verified" : "Verification failed"}</CardTitle>
          <CardDescription>
            {result.ok ? `${result.email} is confirmed.` : result.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={result.ok ? "/login" : "/forgot-password"}>{result.ok ? "Sign in" : "Request a new link"}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

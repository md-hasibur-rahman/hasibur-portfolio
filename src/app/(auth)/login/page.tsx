import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authenticateUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Verified against the database, unlike the cookie-only check in the proxy: a stale cookie
  // falls through to the form instead of starting a redirect loop.
  const user = await authenticateUser();
  if (user && !callbackUrl) {
    redirect(user.role === "ADMIN" ? "/dashboard" : "/account");
  }

  return <LoginForm callbackUrl={callbackUrl} />;
}

import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Rendered by the vault pages and by the client panels when a server action reports
// REAUTH_REQUIRED — the session is valid but older than the vault's recent-login window.
export function ReauthGate({
  callbackUrl,
  title = "Confirm it is you again",
}: {
  callbackUrl: string;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4.5 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>
          The vault only opens within 10 minutes of a fresh sign-in, so a stolen long-lived cookie
          cannot reveal secrets on its own.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          Sign in again with your password and you will come straight back to this page.
        </p>
        <Button asChild>
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in again</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

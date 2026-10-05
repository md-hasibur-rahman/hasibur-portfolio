"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserBlockedAction } from "@/lib/users/actions";

export function UserStatusButton({
  userId,
  blocked,
  label,
}: {
  userId: string;
  blocked: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await setUserBlockedAction({ userId, blocked: !blocked });
      if (result.ok) toast.success(result.message ?? "Updated.");
      else toast.error(result.message);
    });
  }

  return (
    <Button
      aria-busy={pending || undefined}
      className="max-w-full"
      disabled={pending}
      onClick={onClick}
      size="sm"
      variant={blocked ? "outline" : "destructive"}
    >
      <span className="truncate">{blocked ? `Unblock ${label}` : `Block ${label}`}</span>
    </Button>
  );
}

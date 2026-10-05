"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProjectAction } from "@/lib/projects/actions";

export function DeleteProject({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteProjectAction({ id });
      if (result.ok) {
        toast.success("Project deleted.");
        router.push("/dashboard/projects");
        router.refresh();
      } else {
        toast.error(result.message);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} size="sm" variant="outline">
        <Trash2Icon data-icon="inline-start" />
        Delete
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3">
      <span className="text-sm text-muted-foreground">
        Delete &ldquo;{title}&rdquo; permanently? Technology links are removed with it.
      </span>
      <span className="flex items-center gap-2">
        <Button disabled={pending} onClick={onDelete} size="sm" variant="destructive">
          Confirm delete
        </Button>
        <Button disabled={pending} onClick={() => setConfirming(false)} size="sm" variant="ghost">
          Cancel
        </Button>
      </span>
    </div>
  );
}

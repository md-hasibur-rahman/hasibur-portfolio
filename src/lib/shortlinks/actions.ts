"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { toResult, type ActionError, type ActionResult } from "@/lib/action-result";
import {
  createShortLink,
  deleteShortLink,
  unlockShortLink,
  updateShortLink,
} from "@/lib/shortlinks/service";

type UnlockResult = { ok: true; targetUrl: string } | ActionError;

export async function createShortLinkAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const link = await createShortLink(admin.id, payload);
    revalidatePath("/dashboard/tools");
    return { ok: true, message: `Short link created: /s/${link.slug}` };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateShortLinkAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const link = await updateShortLink(admin.id, payload);
    revalidatePath("/dashboard/tools");
    return { ok: true, message: `Short link /s/${link.slug} updated.` };
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteShortLinkAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const link = await deleteShortLink(admin.id, payload);
    revalidatePath("/dashboard/tools");
    return { ok: true, message: `Short link /s/${link.slug} deleted.` };
  } catch (error) {
    return toResult(error);
  }
}

// Intentionally public: the password check (and its throttle) is the gate, not a session.
export async function unlockShortLinkAction(payload: unknown): Promise<UnlockResult> {
  try {
    const { targetUrl } = await unlockShortLink(payload);
    return { ok: true, targetUrl };
  } catch (error) {
    return toResult(error);
  }
}

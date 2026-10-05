"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { toResult, type ActionResult } from "@/lib/action-result";
import { setUserBlocked } from "@/lib/users/service";

export async function setUserBlockedAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await setUserBlocked(admin.id, payload);
    revalidatePath("/dashboard/users");
    return {
      ok: true,
      message: result.blockedAt ? "Account blocked. Its sessions stop working immediately." : "Account unblocked.",
    };
  } catch (error) {
    return toResult(error);
  }
}

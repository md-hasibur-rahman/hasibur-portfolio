"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { toResult, type ActionResult } from "@/lib/action-result";
import { updateProfile } from "@/lib/profile/service";

export async function saveProfileAction(payload: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updateProfile(user.id, payload ?? {});
    revalidatePath("/about");
    return { ok: true, message: "Profile saved." };
  } catch (error) {
    return toResult(error);
  }
}

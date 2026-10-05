"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { toResult, type ActionResult } from "@/lib/action-result";
import { threadStatusSchema } from "@/lib/validations/message";
import { replyToConversation, setThreadStatus, startContactThread } from "@/lib/messaging/threads";

export async function contactAction(payload: unknown): Promise<ActionResult> {
  try {
    const result = await startContactThread(payload);
    return {
      ok: true,
      message: result.notified
        ? "Thanks — your message is saved and the owner has been emailed."
        : "Thanks — your message is saved. Email delivery is not configured, so the owner sees it in the dashboard.",
    };
  } catch (error) {
    return toResult(error);
  }
}

export async function replyAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const result = await replyToConversation(admin.id, payload);
    return {
      ok: true,
      message: result.delivered
        ? "Reply saved and emailed to the visitor."
        : "Reply saved in the thread. No email was sent.",
    };
  } catch (error) {
    return toResult(error);
  }
}

export async function threadStatusAction(payload: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = threadStatusSchema.parse(payload);
    await setThreadStatus(parsed.conversationId, parsed.status);
    return { ok: true, message: `Thread marked ${parsed.status.toLowerCase()}.` };
  } catch (error) {
    return toResult(error);
  }
}

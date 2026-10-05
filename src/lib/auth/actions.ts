"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/config";
import { authenticateUser } from "@/lib/auth/guards";
import {
  registerUser,
  requestPasswordReset,
  resetPassword,
  logoutSession,
} from "@/lib/auth/flows";
import { toResult, type ActionResult } from "@/lib/action-result";
import { loginFormSchema } from "@/lib/validations/auth";
import { db } from "@/lib/db/client";

// A plain sign-in carries no destination, so the owner lands on the admin dashboard while a
// regular member lands on their session page. The lookup happens before signIn, but a wrong
// password still fails first, so it cannot be used to probe for admin accounts.
async function defaultLanding(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { role: true } });
  return user?.role === "ADMIN" ? "/dashboard" : "/account";
}

export async function registerAction(payload: unknown): Promise<ActionResult> {
  try {
    const result = await registerUser(payload);
    return {
      ok: true,
      message:
        result.emailDelivery === "sent"
          ? "Account created. Check your inbox to verify your email."
          : "Account created. Email verification is not configured on this server yet.",
    };
  } catch (error) {
    return toResult(error);
  }
}

export async function loginAction(payload: unknown): Promise<ActionResult> {
  const parsed = loginFormSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: parsed.data.redirectTo ?? (await defaultLanding(parsed.data.email)),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return error.type === "CredentialsSignin"
        ? { ok: false, code: "UNAUTHORIZED", message: "Email or password is incorrect." }
        : { ok: false, code: "UNAUTHORIZED", message: "Unable to sign in right now." };
    }
    // Redirect errors are how Next.js navigation works inside a server action — never swallow them.
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  const user = await authenticateUser();
  if (user) {
    await logoutSession({ userId: user.id, sessionId: user.sessionId });
  }
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(payload: unknown): Promise<ActionResult> {
  try {
    await requestPasswordReset(payload);
    // Deliberately identical wording whether or not the address is registered.
    return { ok: true, message: "If that address has an account, a reset link is on its way." };
  } catch (error) {
    return toResult(error);
  }
}

export async function resetPasswordAction(payload: unknown): Promise<ActionResult> {
  try {
    await resetPassword(payload);
    return { ok: true, message: "Password updated. Please sign in again." };
  } catch (error) {
    return toResult(error);
  }
}

import { db } from "@/lib/db/client";
import { AppError, conflict } from "@/lib/errors";
import { hashPassword } from "@/lib/security/password";
import { issueToken, consumeToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/mailer";
import { logAction } from "@/lib/audit";
import { revokeSession } from "@/lib/auth/session";
import { registerSchema, resetPasswordSchema, forgotPasswordSchema } from "@/lib/validations/auth";

function appUrl(path: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

// Registration can only ever mint a USER; ADMIN is granted exclusively by the seed/bootstrap.
export async function registerUser(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", { details: { fields: parsed.error.flatten().fieldErrors } });
  const { name, username, email, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true },
  });
  if (existing) throw conflict();

  const user = await db.user.create({
    data: {
      name,
      username,
      email,
      passwordHash: await hashPassword(password),
      role: "USER",
      profile: { create: {} },
    },
    select: { id: true, email: true, name: true },
  });

  const token = await issueToken({ userId: user.id, purpose: "EMAIL_VERIFICATION" });
  const link = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  const { delivered } = await sendMail({
    to: user.email,
    subject: "Verify your email",
    text: `Confirm your address: ${link}\nThis link expires in 24 hours.`,
  }).catch(() => ({ delivered: false }));

  await logAction({ action: "auth.register", resource: "user", userId: user.id, resourceId: user.id });

  return { userId: user.id, emailDelivery: delivered ? ("sent" as const) : ("unconfigured" as const) };
}

// Never reveals whether the address exists; the response is identical either way.
export async function requestPasswordReset(input: unknown) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", { details: { fields: parsed.error.flatten().fieldErrors } });

  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true } });

  if (user) {
    const token = await issueToken({ userId: user.id, purpose: "PASSWORD_RESET" });
    const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
    await sendMail({
      to: user.email,
      subject: "Reset your password",
      text: `Choose a new password: ${link}\nThis link expires in 30 minutes. Ignore it if you did not request a reset.`,
    }).catch(() => ({ delivered: false }));
  }

  await logAction({
    action: "auth.password_reset_requested",
    resource: "user",
    userId: user?.id,
    resourceId: user?.id,
  });

  return { requested: true };
}

export async function resetPassword(input: unknown) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", { details: { fields: parsed.error.flatten().fieldErrors } });

  const { userId } = await consumeToken({ raw: parsed.data.token, purpose: "PASSWORD_RESET" });

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    // A reset invalidates every existing session for that account.
    db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  await logAction({ action: "auth.password_reset_completed", resource: "user", userId, resourceId: userId });
  return { completed: true };
}

export async function verifyEmailToken(raw: string) {
  const { userId } = await consumeToken({ raw, purpose: "EMAIL_VERIFICATION" });
  const user = await db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
    select: { email: true },
  });
  await logAction({ action: "auth.email_verified", resource: "user", userId, resourceId: userId });
  return { email: user.email };
}

export async function logoutSession(input: { userId: string; sessionId: string }): Promise<void> {
  await revokeSession(input.sessionId, input.userId);
  await logAction({ action: "auth.logout", resource: "session", userId: input.userId, resourceId: input.sessionId });
}

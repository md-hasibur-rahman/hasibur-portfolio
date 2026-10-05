import type { ZodError } from "zod";
import { db } from "@/lib/db/client";
import { AppError, notFound, rateLimited } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { isEmailConfigured, sendMail } from "@/lib/email/mailer";
import { contactSchema, conversationFilterSchema, replySchema } from "@/lib/validations/message";

const CONTACT_WINDOW_MS = 6 * 60 * 60 * 1000;
const CONTACT_LIMIT = 3;

function appUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

function fieldError(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

export async function startContactThread(input: unknown) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) fieldError(parsed.error);
  const { name, email, subject, body, company } = parsed.data;

  // Honeypot tripped — a bot filled the off-screen field (or a browser autofilled it anyway).
  // Pretend the send worked and save nothing: a validation error on an invisible field leaves a
  // real visitor with nothing to fix, and a loud rejection teaches a bot that it was caught.
  if (company) {
    await logAction({
      action: "contact.spam_blocked",
      resource: "conversation",
      metadata: { characters: body.length },
    });
    return { id: null, notified: isEmailConfigured() };
  }

  const since = new Date(Date.now() - CONTACT_WINDOW_MS);
  const recent = await db.conversation.count({ where: { visitorEmail: email, createdAt: { gt: since } } });
  if (recent >= CONTACT_LIMIT) throw rateLimited();

  const conversation = await db.conversation.create({
    data: {
      visitorName: name,
      visitorEmail: email,
      subject,
      // No senderId: a null sender means the conversation's visitor wrote the message.
      messages: { create: [{ body }] },
    },
    select: { id: true },
  });

  await logAction({
    action: "contact.create",
    resource: "conversation",
    resourceId: conversation.id,
    metadata: { subject, characters: body.length },
  });

  const notified = await notifyOwner(conversation.id);
  return { id: conversation.id, notified };
}

async function notifyOwner(conversationId: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const owners = await db.user.findMany({
    where: { role: "ADMIN", blockedAt: null },
    select: { email: true },
  });
  if (owners.length === 0) return false;

  const thread = await db.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1, select: { body: true } } },
  });

  const result = await sendMail({
    to: owners.map((owner) => owner.email).join(","),
    subject: `New message: ${thread.subject}`,
    text:
      `From: ${thread.visitorName} <${thread.visitorEmail}>\n\n` +
      `${thread.messages[0]?.body ?? ""}\n\n` +
      `Reply in the dashboard: ${appUrl(`/dashboard/messages/${thread.id}`)}`,
  });
  return result.delivered;
}

export async function replyToConversation(userId: string, input: unknown) {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) fieldError(parsed.error);
  const { conversationId, body } = parsed.data;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, subject: true, visitorEmail: true },
  });
  if (!conversation) throw notFound();

  const message = await db.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { conversationId: conversation.id, senderId: userId, body },
      select: { id: true, createdAt: true },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: created.createdAt, status: "OPEN" },
    });
    return created;
  });

  await logAction({
    action: "contact.reply",
    resource: "conversation",
    resourceId: conversation.id,
    userId,
  });

  let delivered = false;
  if (conversation.visitorEmail && isEmailConfigured()) {
    delivered = await sendMail({
      to: conversation.visitorEmail,
      subject: `Re: ${conversation.subject}`,
      text: `${body}\n`,
    })
      .then((result) => result.delivered)
      .catch(() => false);
  }

  return { messageId: message.id, delivered };
}

export async function listConversations(raw: unknown) {
  const filter = conversationFilterSchema.parse(raw);

  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.search
      ? {
          OR: [
            { subject: { contains: filter.search, mode: "insensitive" as const } },
            { visitorEmail: { contains: filter.search, mode: "insensitive" as const } },
            { visitorName: { contains: filter.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filter.unreadOnly ? { messages: { some: { readAt: null, senderId: null } } } : {}),
  };

  const [items, total] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      select: {
        id: true,
        subject: true,
        status: true,
        visitorName: true,
        visitorEmail: true,
        lastMessageAt: true,
        _count: { select: { messages: { where: { readAt: null, senderId: null } } } },
      },
    }),
    db.conversation.count({ where }),
  ]);

  return { items, total, page: filter.page, pageSize: filter.pageSize };
}

// Opening a thread from the dashboard marks the visitor messages read; owner replies are never
// counted as unread.
export async function openThread(conversationId: string) {
  const thread = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!thread) throw notFound();

  await db.message.updateMany({
    where: { conversationId: thread.id, readAt: null, senderId: null },
    data: { readAt: new Date() },
  });

  return thread;
}

export async function setThreadStatus(conversationId: string, status: "OPEN" | "CLOSED" | "ARCHIVED") {
  const updated = await db.conversation.update({
    where: { id: conversationId },
    data: { status },
    select: { id: true, status: true },
  });
  await logAction({ action: "contact.status", resource: "conversation", resourceId: updated.id });
  return updated;
}

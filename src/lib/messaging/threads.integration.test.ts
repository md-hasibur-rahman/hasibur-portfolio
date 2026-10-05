import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { hashPassword } from "@/lib/security/password";
import {
  listConversations,
  openThread,
  replyToConversation,
  setThreadStatus,
  startContactThread,
} from "@/lib/messaging/threads";

// Opt-in: run with RUN_DB_INTEGRATION=1 npm test
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const suite = enabled ? describe : describe.skip;

const suffix = Date.now().toString(36);
const body = "We are building a booking flow and need someone to own the server side of it.";

let ownerId = "";
const visitorEmails: string[] = [];

async function contact(name: string) {
  const email = `${name}-${suffix}@example.test`;
  visitorEmails.push(email);
  return { name, email, subject: ` enquiry ${suffix}`, body };
}

beforeAll(async () => {
  if (!enabled) return;
  const owner = await db.user.create({
    data: {
      email: `owner-${suffix}@example.test`,
      name: "Thread Owner",
      username: `owner${suffix}`,
      passwordHash: await hashPassword("Integration-Owner-123"),
      role: "USER",
    },
    select: { id: true },
  });
  ownerId = owner.id;
});

afterAll(async () => {
  if (!enabled) return;
  await db.conversation.deleteMany({ where: { visitorEmail: { in: visitorEmails } } });
  await db.user.deleteMany({ where: { id: ownerId } });
});

suite("contact threads", () => {
  it("stores a visitor message with no user sender", async () => {
    const result = await startContactThread(await contact("first"));
    expect(result.id).not.toBeNull();

    const thread = await db.conversation.findUniqueOrThrow({
      where: { id: result.id! },
      include: { messages: true },
    });
    expect(thread.userId).toBeNull();
    expect(thread.visitorEmail).toContain("first-");
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]?.senderId).toBeNull();
  });

  it("rejects a fourth thread from the same address inside the window", async () => {
    const payload = await contact("burst");
    for (let i = 0; i < 3; i += 1) await startContactThread(payload);

    await expect(startContactThread(payload)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("silently drops a submission that fills the honeypot", async () => {
    const payload = { ...(await contact("bot")), company: "spam.example" };
    const result = await startContactThread(payload);
    expect(result.id).toBeNull();

    const stored = await db.conversation.count({ where: { visitorEmail: payload.email } });
    expect(stored).toBe(0);
  });

  it("finds threads by search and by unread state", async () => {
    const email = visitorEmails.find((value) => value.startsWith("first-"))!;
    const found = await listConversations({ search: email });
    expect(found.total).toBe(1);
    expect(found.items[0]?._count.messages).toBe(1);

    const unread = await listConversations({ unreadOnly: true, search: email });
    expect(unread.total).toBe(1);
  });

  it("marks visitor messages read when the thread is opened", async () => {
    const email = visitorEmails.find((value) => value.startsWith("first-"))!;
    const { items } = await listConversations({ search: email });
    const id = items[0]!.id;

    const thread = await openThread(id);
    expect(thread.messages).toHaveLength(1);

    const afterOpen = await listConversations({ unreadOnly: true, search: email });
    expect(afterOpen.total).toBe(0);
  });

  it("lets the owner reply and keeps the thread open", async () => {
    const email = visitorEmails.find((value) => value.startsWith("first-"))!;
    const { items } = await listConversations({ search: email });
    const conversationId = items[0]!.id;
    const before = items[0]!.lastMessageAt;

    const result = await replyToConversation(ownerId, { conversationId, body: "Happy to help — when do you need it by?" });
    expect(result.delivered).toBe(false); // test environment never sends mail

    const thread = await openThread(conversationId);
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages.some((message) => message.senderId === ownerId)).toBe(true);
    expect(thread.status).toBe("OPEN");
    expect(thread.lastMessageAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("archives a thread", async () => {
    const email = visitorEmails.find((value) => value.startsWith("first-"))!;
    const { items } = await listConversations({ search: email });
    const updated = await setThreadStatus(items[0]!.id, "ARCHIVED");
    expect(updated.status).toBe("ARCHIVED");

    const archived = await listConversations({ status: "ARCHIVED", search: email });
    expect(archived.total).toBe(1);
  });

  it("returns not found for an unknown thread", async () => {
    await expect(openThread("cuiddoesnotexist00000000")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

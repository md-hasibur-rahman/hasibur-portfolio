import { z } from "zod";

// Public contact form. `company` is a honeypot: it is rendered off-screen and a real visitor never
// types in it. The schema deliberately lets any value through — the service decides what a filled
// honeypot means, so a browser autofill can never trigger a validation error on a field the
// visitor cannot even see.
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Add your name").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email so a reply can reach you")
    .max(200),
  subject: z.string().trim().min(3, "Add a short subject").max(140),
  body: z.string().trim().min(20, "Write at least 20 characters").max(8000),
  company: z.string().trim().max(2048).optional(),
});

export const startConversationSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  body: z.string().trim().min(1, "Write a message").max(8000),
});

export const replySchema = z.object({
  conversationId: z.string().cuid(),
  body: z.string().trim().min(1, "Write a message").max(8000),
});

export const threadStatusSchema = z.object({
  conversationId: z.string().cuid(),
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]),
});

export const conversationFilterSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type ReplyInput = z.infer<typeof replySchema>;
export type ConversationFilter = z.infer<typeof conversationFilterSchema>;

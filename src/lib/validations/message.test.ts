import { describe, expect, it } from "vitest";
import { contactSchema } from "./message";

const valid = {
  name: "Rima Islam",
  email: "Rima@Example.com",
  subject: "Project enquiry",
  body: "We are looking for someone to build a small logistics dashboard, are you available?",
};

describe("contactSchema", () => {
  it("normalises the reply address to lowercase", () => {
    const parsed = contactSchema.parse(valid);
    expect(parsed.email).toBe("rima@example.com");
  });

  it("rejects a message that is too short to act on", () => {
    expect(contactSchema.safeParse({ ...valid, body: "hi" }).success).toBe(false);
  });

  it("rejects an invalid reply address", () => {
    expect(contactSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("passes a filled honeypot through so the service can drop it silently", () => {
    const parsed = contactSchema.parse({ ...valid, company: "spam.example" });
    expect(parsed.company).toBe("spam.example");
  });

  it("accepts an empty honeypot", () => {
    expect(contactSchema.safeParse({ ...valid, company: "" }).success).toBe(true);
  });
});

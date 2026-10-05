import { describe, expect, it } from "vitest";
import { loginFormSchema, registerSchema } from "@/lib/validations/auth";

const valid = {
  name: "Hasibur Rahman",
  username: "hasibur",
  email: "Hasibur@Example.COM",
  password: "Str0ng-Password-2026",
};

describe("registration validation", () => {
  it("normalises the email to lowercase", () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe("hasibur@example.com");
  });

  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short1A" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "all-lowercase-123" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "NOLOWERCASE123" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "NoDigitsHere!!!" }).success).toBe(false);
  });

  it("ignores a role field supplied by the client, so ADMIN cannot be self-assigned", () => {
    const parsed = registerSchema.parse({ ...valid, role: "ADMIN" });
    expect("role" in parsed).toBe(false);
  });

  it("rejects usernames with characters that would break a slug or handle", () => {
    expect(registerSchema.safeParse({ ...valid, username: "has ibur!" }).success).toBe(false);
  });
});

describe("login redirect target", () => {
  it("accepts an internal callbackUrl", () => {
    expect(loginFormSchema.safeParse({ email: "a@b.co", password: "x", redirectTo: "/account/messages" }).success).toBe(true);
  });

  it("rejects protocol-relative and absolute redirect targets", () => {
    const base = { email: "a@b.co", password: "x" };
    expect(loginFormSchema.safeParse({ ...base, redirectTo: "//evil.example" }).success).toBe(false);
    expect(loginFormSchema.safeParse({ ...base, redirectTo: "https://evil.example" }).success).toBe(false);
  });
});

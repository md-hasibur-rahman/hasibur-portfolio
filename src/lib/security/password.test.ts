import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("Argon2id password hashing", () => {
  it("verifies the correct password", async () => {
    const stored = await hashPassword("Correct-Horse-1!");
    expect(await verifyPassword("Correct-Horse-1!", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("Correct-Horse-1!");
    expect(await verifyPassword("wrong-password-2", stored)).toBe(false);
  });

  it("never stores the plaintext and salts each hash differently", async () => {
    const password = "Correct-Horse-1!";
    const a = await hashPassword(password);
    const b = await hashPassword(password);
    expect(a).not.toContain(password);
    expect(a).not.toBe(b);
    expect(a.startsWith("$argon2id$")).toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
  });

  it("ignores cost parameters embedded in a tampered hash", async () => {
    // A tampered row must not be able to force unbounded memory allocation at verify time.
    const tampered = "$argon2id$v=19$m=2147483648,t=2,p=64$AAAA$AAAA";
    expect(await verifyPassword("anything", tampered)).toBe(false);
  });
});

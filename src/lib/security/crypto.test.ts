import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashToken, randomToken } from "@/lib/security/crypto";

// A fixed key keeps these tests independent of VAULT_ENCRYPTION_KEY.
const KEY = new Uint8Array(32).fill(7);

describe("AES-256-GCM secret encryption", () => {
  it("round-trips a secret", () => {
    const payload = encryptSecret("sup3r-secret-value", KEY);
    expect(decryptSecret(payload, KEY)).toBe("sup3r-secret-value");
  });

  it("never leaks the plaintext and produces a fresh ciphertext each time", () => {
    const secret = "sup3r-secret-value";
    const a = encryptSecret(secret, KEY);
    const b = encryptSecret(secret, KEY);
    expect(a).not.toContain(secret);
    expect(a).not.toBe(b);
  });

  it("refuses to decrypt with the wrong key", () => {
    const payload = encryptSecret("value", KEY);
    expect(() => decryptSecret(payload, new Uint8Array(32).fill(8))).toThrow();
  });

  it("detects tampering of the ciphertext", () => {
    const payload = encryptSecret("value", KEY);
    const [iv, tag, ciphertext] = payload.split(".");
    const flipped = Buffer.from(ciphertext, "base64");
    flipped[0] ^= 0xff;
    expect(() => decryptSecret([iv, tag, flipped.toString("base64")].join("."), KEY)).toThrow();
  });

  it("rejects structurally malformed payloads", () => {
    expect(() => decryptSecret("only-one-part", KEY)).toThrow();
  });

  it("hashes tokens one-way and yields url-safe random tokens", () => {
    const token = randomToken();
    expect(token).not.toContain("+");
    expect(token).not.toContain("=");
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
  });
});

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function readKey(envName: string, purpose: string): Buffer {
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`${envName} is not configured. ${purpose} is unavailable.`);
  }
  // Accept 32 raw bytes as hex or base64 so operators can paste output from any generator.
  const key = /^(0x)?[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw.replace(/^0x/, ""), "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envName} must decode to exactly 32 bytes for AES-256-GCM.`);
  }
  return key;
}

export function vaultKey(): Buffer {
  return readKey("VAULT_ENCRYPTION_KEY", "The encrypted vault and credential store");
}

// Format: base64(iv).base64(authTag).base64(ciphertext)
export function encryptSecret(plaintext: string, key: Uint8Array = vaultKey()): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64")).join(".");
}

export function decryptSecret(payload: string, key: Uint8Array = vaultKey()): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Malformed ciphertext.");
  const [iv, authTag, ciphertext] = parts.map((part) => Buffer.from(part, "base64"));
  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Malformed ciphertext.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

// Tokens stored in the database (session, email verification, reset) are only ever kept hashed.
// Lookup is by hash, so a stolen row cannot be replayed and plaintext tokens never hit Postgres.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

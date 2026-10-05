import { argon2id } from "hash-wasm";

// OWASP-aligned Argon2id parameters. Tuned so verification stays usable on low-end hardware.
const MEMORY_COST_KIB = 64 * 1024; // 64 MiB
const TIME_COST = 3;
const PARALLELISM = 1;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Stored as the PHC-style string: $argon2id$v=19$m=..,t=..,p=..$<salt>$<hash>
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const digest = await argon2id({
    password,
    salt,
    parallelism: PARALLELISM,
    memorySize: MEMORY_COST_KIB,
    iterations: TIME_COST,
    hashLength: HASH_LENGTH,
    outputType: "binary",
  });

  return [
    "$argon2id",
    "v=19",
    `m=${MEMORY_COST_KIB},t=${TIME_COST},p=${PARALLELISM}`,
    toBase64(salt),
    toBase64(digest),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  // ["", "argon2id", "v=19", "m=..,t=..,p=..", salt, hash]
  if (parts.length !== 6 || parts[1] !== "argon2id" || !parts[4] || !parts[5]) return false;

  const salt = fromBase64(parts[4]);
  const expected = fromBase64(parts[5]);
  // Reject structurally invalid digests before spending any memory on derivation.
  if (salt.length < SALT_LENGTH || expected.length < 16 || expected.length > 64) return false;

  // Cost parameters are deliberately not read back from the stored string: a tampered row must
  // not be able to make the server allocate unbounded memory during verification.
  const digest = await argon2id({
    password,
    salt,
    parallelism: PARALLELISM,
    memorySize: MEMORY_COST_KIB,
    iterations: TIME_COST,
    hashLength: expected.length,
    outputType: "binary",
  });

  return constantTimeEqual(digest, expected);
}

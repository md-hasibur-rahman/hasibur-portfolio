// Temporary smoke harness: creates throwaway admin/member accounts, checks HTTP status and
// authorization for every dashboard route, then deletes them. Run with: npx tsx smoke-dashboard.mts
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security/password";
import { encryptSecret } from "../src/lib/security/crypto";

const db = new PrismaClient();
const base = process.env.APP_URL ?? "http://localhost:3000";

const routes = [
  "/dashboard",
  "/dashboard/projects",
  "/dashboard/projects/new",
  "/dashboard/messages",
  "/dashboard/media",
  "/dashboard/tools",
  "/dashboard/vault",
  "/dashboard/credentials",
  "/dashboard/users",
  "/dashboard/audit",
  "/dashboard/settings",
];

const tag = randomBytes(4).toString("hex");
let adminId = "";
let userId = "";
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  const detail = ok ? "" : "  (want " + String(expected) + ")";
  console.log((ok ? "PASS  " : "FAIL  ") + label + "  -> " + String(actual) + detail);
}

async function login(email: string, password: string) {
  const csrfRes = await fetch(base + "/api/auth/csrf");
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const jar = (csrfRes.headers.getSetCookie() ?? []).map((line) => line.split(";")[0]).join("; ");

  const res = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: base }),
    redirect: "manual",
  });

  const session = (res.headers.getSetCookie() ?? [])
    .map((line) => line.split(";")[0])
    .find((pair) => pair.includes("session-token"));
  if (!session) throw new Error("login failed for " + email + " (status " + res.status + ")");
  return { cookie: session };
}

type Session = { cookie: string };

async function get(path: string, session?: Session) {
  const res = await fetch(base + path, {
    headers: session ? { cookie: session.cookie } : {},
    redirect: "manual",
  });
  return { status: res.status, text: await res.text() };
}

async function main() {
  const password = randomBytes(12).toString("hex");
  const hash = await hashPassword(password);

  const [admin, member] = await Promise.all([
    db.user.create({
      data: {
        email: "smoke-admin-" + tag + "@example.test",
        name: "Smoke Admin",
        username: "smokeadmin" + tag,
        passwordHash: hash,
        role: "ADMIN",
      },
      select: { id: true },
    }),
    db.user.create({
      data: {
        email: "smoke-user-" + tag + "@example.test",
        name: "Smoke Member",
        username: "smokeuser" + tag,
        passwordHash: hash,
        role: "USER",
      },
      select: { id: true },
    }),
  ]);
  adminId = admin.id;
  userId = member.id;

  const adminSession = await login("smoke-admin-" + tag + "@example.test", password);
  const memberSession = await login("smoke-user-" + tag + "@example.test", password);
  console.log("signed in as both throwaway accounts");

  for (const path of routes) {
    check("anon   " + path, (await get(path)).status, 307);
    check("admin  " + path, (await get(path, adminSession)).status, 200);

    const asMember = await get(path, memberSession);
    check("member " + path, asMember.status, 403);
    if (asMember.status === 403 && !asMember.text.includes("403")) {
      failures++;
      console.log("FAIL  member " + path + " body lacks the forbidden notice");
    }
  }

  check("anon   /api/admin/audit-logs", (await get("/api/admin/audit-logs")).status, 401);
  check("member /api/admin/audit-logs", (await get("/api/admin/audit-logs", memberSession)).status, 403);
  check("admin  /api/admin/audit-logs", (await get("/api/admin/audit-logs", adminSession)).status, 200);

  const list = await get("/dashboard/projects", adminSession);
  check("admin  project list shows seeded work", list.text.includes("hasibur-downloader"), true);

  const settings = await get("/dashboard/settings", adminSession);
  check("admin  settings renders profile form", settings.text.includes("Public profile"), true);

  const media = await get("/dashboard/media", adminSession);
  check("admin  media library renders", media.text.includes("in the library"), true);

  const newProject = await get("/dashboard/projects/new", adminSession);
  check("admin  project form offers a thumbnail", newProject.text.includes("thumbnailAssetId"), true);

  // Short links: an open one redirects (and counts), a protected one gates, strangers get 404.
  const openSlug = "smoke-open-" + tag;
  const lockSlug = "smoke-lock-" + tag;
  const target = "https://example.com/smoke-target";
  await db.shortLink.create({
    data: { slug: openSlug, targetUrl: target, title: "Smoke target", createdBy: adminId },
  });
  await db.shortLink.create({
    data: {
      slug: lockSlug,
      targetUrl: target,
      passwordHash: await hashPassword("smoke-pass-" + tag),
      createdBy: adminId,
    },
  });

  const opened = await fetch(base + "/s/" + openSlug, { redirect: "manual" });
  check("anon   open /s/<slug> is a redirect", opened.status >= 300 && opened.status < 400, true);
  check("anon   open /s/<slug> points at the target", opened.headers.get("location"), target);

  const counted = await db.shortLink.findUnique({
    where: { slug: openSlug },
    select: { clicks: true },
  });
  check("open link counted the click", counted?.clicks, 1);

  const locked = await get("/s/" + lockSlug);
  check("anon   locked /s/<slug> renders the gate", locked.status, 200);
  check("locked gate shows the password form", locked.text.includes("unlock-password"), true);

  check("anon   unknown /s/<slug> is a 404", (await get("/s/no-such-" + tag)).status, 404);

  const tools = await get("/dashboard/tools", adminSession);
  check("admin  tools page renders QR studio", tools.text.includes("QR studio"), true);
  check("admin  tools page lists the smoke link", tools.text.includes("/s/" + openSlug), true);
  check("admin  tools page mentions the downloader", tools.text.includes("Video downloader"), true);

  // Vault: metadata renders, but plaintext and ciphertext must never reach the HTML.
  const vault = await get("/dashboard/vault", adminSession);
  const credentials = await get("/dashboard/credentials", adminSession);
  if (process.env.VAULT_ENCRYPTION_KEY) {
    const secretPlain = "smoke-secret-" + tag;
    const ciphertext = encryptSecret(secretPlain);
    const vaultTitle = "smoke-vault-" + tag;
    await db.vaultItem.create({
      data: {
        ownerId: adminId,
        title: vaultTitle,
        category: "Smoke",
        encryptedPassword: ciphertext,
      },
    });
    const vaultWithItem = await get("/dashboard/vault", adminSession);
    check("admin  vault lists the smoke entry", vaultWithItem.text.includes(vaultTitle), true);
    check("vault HTML hides the plaintext secret", vaultWithItem.text.includes(secretPlain), false);
    check("vault HTML hides the ciphertext", vaultWithItem.text.includes(ciphertext), false);
    check("vault page renders the new-entry form", vaultWithItem.text.includes("New vault entry"), true);
  } else {
    check("vault page skipped secret checks (key not set)", true, true);
  }
  check("admin  credentials page renders the form", credentials.text.includes("New API credential"), true);
  check("vault page shows either the form or the re-auth gate", vault.status, 200);
}

main()
  .catch((error) => {
    failures++;
    console.error("SMOKE ERROR", error instanceof Error ? error.message : error);
  })
  .finally(async () => {
    await db.loginAttempt.deleteMany({
      where: { email: { in: ["smoke-admin-" + tag + "@example.test", "smoke-user-" + tag + "@example.test"] } },
    });
    await db.shortLink.deleteMany({ where: { createdBy: { in: [adminId, userId] } } });
    await db.vaultItem.deleteMany({ where: { ownerId: { in: [adminId, userId] } } });
    await db.apiCredential.deleteMany({ where: { ownerId: { in: [adminId, userId] } } });
    await db.auditLog.deleteMany({ where: { userId: { in: [adminId, userId] } } });
    await db.user.deleteMany({ where: { id: { in: [adminId, userId] } } });
    await db.$disconnect();
    console.log("");
    console.log("throwaway accounts removed. " + (failures === 0 ? "ALL CHECKS PASSED" : failures + " FAILURE(S)"));
    process.exit(failures === 0 ? 0 : 1);
  });

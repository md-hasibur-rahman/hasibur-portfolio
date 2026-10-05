# Portfolio — full-stack foundation (Phases 1–4)

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui, PostgreSQL + Prisma, Auth.js v5
with Argon2id password hashing, database-backed revocable sessions, role-based authorization,
validation, error responses and audit logging.

What is **not** here yet, on purpose: the public portfolio sections, messaging, admin dashboard
screens, Cloudinary media, the encrypted vault and the API-credential manager. Those are later
phases of the brief, and nothing is stubbed with fake data or pretend endpoints.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, Server Components by default |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives), next-themes dark mode |
| Database | PostgreSQL + Prisma 6.19 |
| Auth | Auth.js (`next-auth` 5.0.0-beta.32), Credentials provider |
| Password hashing | Argon2id via `hash-wasm` (WASM — no native build step) |
| Secret encryption | AES-256-GCM (Node `crypto`) for the vault and API credentials |
| Validation | Zod v4 (client and server) |
| Tests | Vitest |

## Setup

```powershell
Copy-Item .env.example .env
# fill DATABASE_URL, AUTH_SECRET, VAULT_ENCRYPTION_KEY, APP_URL (and OWNER_* for the seed)
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Generate the two secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # VAULT_ENCRYPTION_KEY
```

`.env` is git-ignored. Never commit it, and never prefix a server-side secret with `NEXT_PUBLIC_`.

> The working copy already has a `.env` with a **placeholder** `DATABASE_URL` pointing at
> `localhost:5432` plus locally generated `AUTH_SECRET` / `VAULT_ENCRYPTION_KEY`. Replace the
> database URL with your own before migrating.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Signs/encrypts the Auth.js session cookie |
| `APP_URL` | recommended | Origin used to build verification and reset links |
| `VAULT_ENCRYPTION_KEY` | for the vault phase | 32 bytes, hex or base64; never stored in the database |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | for the media phase | Server-side only |
| `EMAIL_SERVER_HOST` / `EMAIL_SERVER_PORT` / `EMAIL_SERVER_USER` / `EMAIL_SERVER_PASSWORD` / `EMAIL_FROM` | for email delivery | See “Email delivery” |
| `OWNER_EMAIL` / `OWNER_NAME` / `OWNER_USERNAME` / `OWNER_PASSWORD` | seed only | Bootstraps the single ADMIN account; delete afterwards |

## Security model

- **Passwords** — Argon2id, 64 MiB memory / 3 iterations / parallelism 1, 16-byte random salt,
  stored as a PHC-style string. Plaintext is never persisted, logged or returned. Verification
  ignores cost parameters embedded in a stored string (a tampered row cannot force unbounded memory
  use) and compares digests in constant time.
- **Sessions** — Auth.js writes a signed, encrypted JWT into an `HttpOnly`, `Secure`,
  `SameSite=Lax` cookie. Nothing auth-related lives in `localStorage`. The JWT carries a `sessionId`
  that must match a live row in `sessions`; expiry, revocation and account blocking are checked
  server-side on every request, which is what makes “log out all other sessions” effective.
- **Authorization** — `authenticateUser()`, `requireUser()`, `requireRole()`, `requireAdmin()`,
  `requireVaultAccess()` in `src/lib/auth/guards.ts`. Hiding UI is never the boundary: pages,
  server actions and route handlers each verify against the database. `src/proxy.ts` only performs
  an optimistic cookie check for redirects (Next.js 16 renamed middleware to *proxy*).
- **Roles** — registration can only create `USER`; the Zod schema has no `role` field, so a crafted
  `{"role":"ADMIN"}` body is discarded (covered by a test). `ADMIN` comes only from the seed.
- **Tokens** — email-verification and password-reset tokens are 32 random bytes; only their SHA-256
  hash is stored, and they are single-use with 24 h / 30 min expiry.
- **Vault re-authentication** — `requireVaultAccess()` demands an `ADMIN` session authenticated
  within the last 10 minutes, otherwise `403 REAUTH_REQUIRED`.
- **Rate limiting** — failed-login budget per email (5) and per IP (25) in a 15-minute window, plus
  a sliding-window budget helper for user-generated content.
- **Audit logging** — login, failed login, blocked login, logout, register, email verified, password
  reset requested/completed (and later media/vault/project actions). Metadata keys matching
  `password|secret|token|key|otp|authorization|cookie` are redacted before insertion.
- **HTTP surface** — CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS in production, `X-Powered-By` disabled; consistent JSON errors
  (401/403/404/409/422/429/500) via `src/lib/http.ts`, with no stack traces to the client.

## Database schema

`prisma/schema.prisma` defines `User`, `Session`, `Profile`, `Project`, `Technology`,
`ProjectTechnology`, `Conversation`, `Message`, `Asset`, `VaultItem`, `ApiCredential`, `AuditLog`,
plus `AuthToken` (verification/reset) and `LoginAttempt` (throttling), with enums `Role`,
`ProjectStatus`, `ConversationStatus`, `AssetResourceType`, `AuditStatus` and `AuthMethod`
(`PASSWORD|TOTP|PASSKEY`, MFA-ready).

Media binaries live in Cloudinary; PostgreSQL stores only metadata and references.

## Routes

```
(public)  /
(auth)    /login /register /forgot-password /reset-password /verify-email
account   /account
admin     /dashboard
api       /api/auth/[...nextauth] /api/me /api/admin/audit-logs
```

## Email delivery

Verification and reset links need SMTP credentials. Without them:

- the token is still created and stored, and the request still succeeds;
- in development the mail body is printed to the server console so the link is followable;
- in production sending throws a clear configuration error instead of silently dropping mail.

Registration responses say which of these happened rather than claiming mail was sent.

## Commands

```powershell
npm.cmd run dev            # dev server
npm.cmd run build          # production build
npm.cmd run start          # serve the production build
npm.cmd run typecheck      # tsc --noEmit
npm.cmd run lint           # eslint
npm.cmd run format         # prettier
npm.cmd run test           # vitest (unit tests; DB integration suite is opt-in)
npm.cmd run db:generate    # prisma generate
npm.cmd run db:migrate     # prisma migrate dev
npm.cmd run db:deploy      # prisma migrate deploy (release step)
npm.cmd run db:studio      # prisma studio
npm.cmd run db:seed        # bootstrap the owner/admin account
```

## Tests

`npm.cmd run test` runs 21 unit tests: Argon2id hashing and wrong-password rejection,
tampered-hash handling, AES-256-GCM round-trip/wrong-key/tamper detection, token hashing, Zod rules
(weak passwords, self-assigned `role`, open-redirect `callbackUrl`), role logic and the vault
re-authentication window.

The integration suite is opt-in because it writes real rows:

```powershell
$env:RUN_DB_INTEGRATION = "1"
npm.cmd run test
```

It then verifies session ownership mismatch, revoked/expired/blocked sessions,
revoke-other-sessions, login throttling and single-use tokens against the migrated database.
End-to-end HTTP assertions (real `403` from `/dashboard/*` and `/api/admin/audit-logs` through a
running server) come with the dashboard phase.

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `APP_URL`, `VAULT_ENCRYPTION_KEY`, plus the Cloudinary/SMTP vars you use.
3. Run `npx prisma migrate deploy` during release, before traffic switches.
4. `npm.cmd run build` then `npm.cmd run start` (or the platform's Node builder).
5. Bootstrap the owner once with `OWNER_*` vars, run `npm.cmd run db:seed`, then delete them.
6. Terminate TLS at the edge so `Secure` cookies are issued; keep the origin unreachable over HTTP.

## Roadmap (remaining phases of the brief)

Phase 5 public portfolio · Phase 6 messaging · Phase 7 admin dashboard · Phase 8 Cloudinary media ·
Phase 9 encrypted vault + API credentials · Phase 10 security hardening/MFA/e2e tests ·
Phase 11 deployment.

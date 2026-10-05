import { createTransport, type Transporter } from "nodemailer";

type EmailConfig = {
  host: string;
  user: string;
  password: string;
  from: string;
};

function readConfig(): EmailConfig | null {
  const host = process.env.EMAIL_SERVER_HOST;
  const user = process.env.EMAIL_SERVER_USER;
  const password = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !password || !from) return null;
  return { host, user, password, from };
}

let cached: Transporter | null = null;

function transporter(config: EmailConfig): Transporter {
  cached ??= createTransport({
    host: config.host,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    secure: process.env.EMAIL_SERVER_SECURE === "true",
    auth: { user: config.user, pass: config.password },
  });
  return cached;
}

export type Mail = { to: string; subject: string; text: string; html?: string };

// Verification and reset links depend on SMTP credentials. When they are absent the token is
// still issued and stored; only delivery is unavailable, and that is surfaced instead of faked.
export async function sendMail(mail: Mail): Promise<{ delivered: boolean }> {
  // The test runner must never reach a real SMTP server, even when valid credentials are present
  // in the developer's local .env.
  if (process.env.NODE_ENV === "test") return { delivered: false };

  const config = readConfig();

  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email not sent] EMAIL_* env vars are unset.\n", mail);
      return { delivered: false };
    }
    throw new Error("Email transport is not configured. Set EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD and EMAIL_FROM.");
  }

  await transporter(config).sendMail({ from: config.from, ...mail });
  return { delivered: true };
}

export function isEmailConfigured(): boolean {
  return readConfig() !== null;
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db/client";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/security/password";
import { assertLoginAllowed, recordLoginAttempt } from "@/lib/security/rate-limit";
import { requestContext } from "@/lib/request";
import { createDbSession, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { logAction } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input) {
        const parsed = loginSchema.safeParse(input);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const { ipAddress, userAgent } = await requestContext();

        await assertLoginAllowed({ email, ipAddress });

        const user = await db.user.findUnique({ where: { email } });
        const ok = user && (await verifyPassword(password, user.passwordHash));

        if (!user || !ok) {
          await recordLoginAttempt({ email, ipAddress, succeeded: false });
          await logAction({
            action: "auth.login_failed",
            resource: "session",
            userId: user?.id,
            status: "FAILURE",
            metadata: { emailDomain: email.split("@")[1] },
          });
          return null;
        }

        if (user.blockedAt) {
          await logAction({
            action: "auth.login_blocked",
            resource: "session",
            userId: user.id,
            status: "FAILURE",
          });
          return null;
        }

        await recordLoginAttempt({ email, ipAddress, succeeded: true });
        const session = await createDbSession({ userId: user.id }, { ipAddress, userAgent });

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await logAction({ action: "auth.login", resource: "session", userId: user.id, resourceId: session.id });

        return {
          id: user.id,
          role: user.role,
          sessionId: session.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_TTL_SECONDS,
    updateAge: 60 * 60,
  },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      // A fresh sign-in seeds the claims; later requests reuse them without touching the DB.
      const claims = token as typeof token & {
        uid?: string;
        role?: "USER" | "ADMIN";
        sessionId?: string;
      };
      if (user) {
        claims.uid = user.id;
        claims.role = user.role;
        claims.sessionId = user.sessionId;
        claims.authTime = Math.floor(Date.now() / 1000);
      }
      return claims;
    },
    session({ session, token }) {
      const claims = token as typeof token & {
        uid?: string;
        role?: "USER" | "ADMIN";
        sessionId?: string;
      };
      session.user.id = claims.uid ?? "";
      session.user.role = claims.role ?? "USER";
      session.user.sessionId = claims.sessionId ?? "";
      return session;
    },
  },
});

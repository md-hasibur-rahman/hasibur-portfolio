import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: it saves a render for clearly-signed-out visitors.
// Every protected page, server action and route handler re-verifies against the database —
// this file is not the authorization boundary.
//
// It must never send a cookie-bearing request *away* from /login: the cookie can be stale
// (revoked session, deleted account), and a signed-in-looking redirect here would bounce
// against the page-level check forever.
const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));

  const needsSignIn = pathname.startsWith("/account") || pathname.startsWith("/dashboard");
  if (needsSignIn && !hasSessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/dashboard/:path*"],
};

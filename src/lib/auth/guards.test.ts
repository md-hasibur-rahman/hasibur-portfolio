import { describe, expect, it } from "vitest";
import { canAccessRole } from "@/lib/auth/roles";
import { isAuthenticatedRecently, REAUTH_WINDOW_MS } from "@/lib/auth/session";

describe("role authorization", () => {
  it("lets ADMIN reach admin resources and refuses USER", () => {
    expect(canAccessRole("ADMIN", "ADMIN")).toBe(true);
    expect(canAccessRole("USER", "ADMIN")).toBe(false);
  });

  it("lets any signed-in role reach USER resources", () => {
    expect(canAccessRole("USER", "USER")).toBe(true);
    expect(canAccessRole("ADMIN", "USER")).toBe(true);
  });
});

describe("vault re-authentication window", () => {
  it("accepts a fresh authentication", () => {
    expect(isAuthenticatedRecently(new Date(), Date.now())).toBe(true);
  });

  it("refuses authentication older than the window", () => {
    const stale = new Date(Date.now() - REAUTH_WINDOW_MS - 1000);
    expect(isAuthenticatedRecently(stale, Date.now())).toBe(false);
  });
});

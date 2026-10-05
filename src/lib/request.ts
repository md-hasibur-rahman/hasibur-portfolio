import { headers } from "next/headers";

// Best-effort client identity for audit rows and throttling. Values come from headers,
// so treat them as informational only — never as an authorization signal.
export async function requestContext(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const store = await headers();
    const forwarded = store.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || store.get("x-real-ip") || null;
    return { ipAddress, userAgent: store.get("user-agent") };
  } catch {
    // Outside a request (CLI seed, background job) headers do not exist; the action still gets logged.
    return { ipAddress: null, userAgent: null };
  }
}

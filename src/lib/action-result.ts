import { AppError } from "@/lib/errors";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionError = { ok: false; code: string; message: string; fields?: FieldErrors };

export type ActionResult = { ok: true; message?: string } | ActionError;

// Server actions never leak internals: an unexpected failure becomes a generic message here and
// the real error only reaches the server log. Only the message/stack is logged — raw SDK error
// objects can carry credentials (Cloudinary puts api_key:api_secret into request_options.auth).
function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`;
  if (typeof error === "object" && error !== null) {
    const nested = (error as { error?: { message?: unknown } }).error;
    const message = nested?.message ?? (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function toResult(error: unknown): ActionError {
  if (error instanceof AppError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      fields: error.details?.fields as FieldErrors | undefined,
    };
  }
  console.error("Server action failed:", describeError(error));
  return { ok: false, code: "INTERNAL", message: "Something went wrong. Please try again." };
}

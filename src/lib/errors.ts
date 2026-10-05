import { ZodError } from "zod";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "REAUTH_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INTERNAL";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  REAUTH_REQUIRED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

// Public message only — never leak internals or stack traces to the client.
const GENERIC_MESSAGE: Record<AppErrorCode, string> = {
  UNAUTHORIZED: "You must be signed in.",
  FORBIDDEN: "You do not have access to this resource.",
  REAUTH_REQUIRED: "Sign in again to open this.",
  NOT_FOUND: "Not found.",
  CONFLICT: "That value is already taken.",
  VALIDATION: "Some of the submitted fields are invalid.",
  RATE_LIMITED: "Too many requests. Please try again shortly.",
  UNAVAILABLE: "This storage provider is not configured.",
  INTERNAL: "Something went wrong.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: AppErrorCode, options?: { details?: Record<string, unknown> }) {
    super(GENERIC_MESSAGE[code]);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options?.details;
  }
}

export function unauthorized(): AppError {
  return new AppError("UNAUTHORIZED");
}

export function forbidden(): AppError {
  return new AppError("FORBIDDEN");
}

export function reauthRequired(): AppError {
  return new AppError("REAUTH_REQUIRED");
}

export function notFound(): AppError {
  return new AppError("NOT_FOUND");
}

export function conflict(): AppError {
  return new AppError("CONFLICT");
}

export function rateLimited(): AppError {
  return new AppError("RATE_LIMITED");
}

export function validationError(error: ZodError): AppError {
  return new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

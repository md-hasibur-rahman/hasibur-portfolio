import { PrismaClient } from "@prisma/client";

// Neon's free tier scales to zero after a few idle minutes, and the first query after a nap fails
// with "Can't reach database server" until the compute wakes up. Retrying connection-class errors
// turns that error page into a short wait — for local dev and for the first visitor in prod.
// Only errors raised before the server could execute anything are retried, so a write never runs twice.
const RETRYABLE_CODES = new Set(["P1001", "P1002", "P2024"]);
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2_000;

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "PrismaClientInitializationError") return true;
  return (
    error.name === "PrismaClientKnownRequestError" &&
    RETRYABLE_CODES.has((error as { code?: string }).code ?? "")
  );
}

// Reuse a single client across hot reloads so the connection pool is not exhausted in dev; the
// retry extension wraps that shared client fresh on every module load, so hot reloads pick it up.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

export const db = client.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (!isConnectionError(error) || attempt >= MAX_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          }
        }
      },
    },
  },
});

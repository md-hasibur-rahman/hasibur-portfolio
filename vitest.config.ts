import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Serial: the integration suite shares one database and cleans up after itself.
    fileParallelism: false,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // The real `server-only` entry throws unless React's react-server condition is active, which
      // only Next does. Tests import server modules directly, so the marker resolves to a stub.
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only-stub.ts"),
    },
  },
});

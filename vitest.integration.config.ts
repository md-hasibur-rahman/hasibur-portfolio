import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// The DB suite is opt-in because a placeholder DATABASE_URL must not make `npm test` hit a dead host.
// Run with: npm run test:integration
export default mergeConfig(base, defineConfig({ test: { env: { RUN_DB_INTEGRATION: "1" } } }));

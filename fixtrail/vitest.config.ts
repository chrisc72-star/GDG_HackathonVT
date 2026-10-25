/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This file configures Vitest for the project’s unit tests. It selects the test environment and TypeScript test-file matching rules.
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

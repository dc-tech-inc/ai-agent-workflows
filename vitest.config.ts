import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "prompts/**/*.ts", "support-bot/**/*.ts", "evals/**/*.ts", "examples/**/*.ts"],
      exclude: ["**/cli.ts", "**/run.ts"],
      reporter: ["text", "json-summary"],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
    },
  },
});

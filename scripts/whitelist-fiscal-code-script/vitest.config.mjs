import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["node_modules/", "src/main.ts", "**/*.spec.ts"],
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 75,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
    environment: "node",
    globals: true,
  },
});

import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      react: "next/dist/compiled/react",
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

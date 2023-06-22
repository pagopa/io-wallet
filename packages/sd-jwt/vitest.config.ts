import { defineConfig, defaultExclude } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...defaultExclude, "__integrations__"],
    typecheck: {
      ignoreSourceErrors: true,
    },
  },
});

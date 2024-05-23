import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/app/main.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "node18",
});

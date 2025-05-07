import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/', 'src/main.ts', '**/*.spec.ts'],
      thresholds: {
        statements: 75,
        functions: 75,
        branches: 75,
        lines: 75,
      },
    },
  },
});

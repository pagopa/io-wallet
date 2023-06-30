require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ["@pagopa/eslint-config/recommended"],
  ignorePatterns: [
    "**/models/*.ts",
    "*.yaml",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.test-d.ts",
  ],
  rules: {
    "max-classes-per-file": "off",
  },
};

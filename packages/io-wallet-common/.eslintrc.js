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
    "**/*.spec.ts",
    "*.json",
    ".eslintrc.js",
  ],
  rules: {
    "max-classes-per-file": "off",
  },
};

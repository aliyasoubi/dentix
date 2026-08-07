// Root ESLint flat config shared by every workspace.
// Per CLAUDE.md: "Strict TypeScript, no `any` outside audited adapters, exhaustive state handling."
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.spec.ts"],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);

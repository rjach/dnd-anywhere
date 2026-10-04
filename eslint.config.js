import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Network APIs the extension must never use. See docs/security-model.md. */
const NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].map((name) => ({
  name,
  message: "DnD Anywhere makes no network requests. See CONTRIBUTING.md#privacy-rules.",
}));

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.output/**",
      "**/.wxt/**",
      "**/dist/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "site/.astro/**",
      "extension/tests/fixtures/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["extension/src/**/*.ts", "extension/entrypoints/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        browser: "readonly",
        defineBackground: "readonly",
        defineContentScript: "readonly",
      },
    },
    rules: {
      "no-restricted-globals": ["error", ...NETWORK_GLOBALS],
      "no-restricted-properties": [
        "error",
        { object: "navigator", property: "sendBeacon", message: "No network requests." },
      ],
    },
  },
  {
    files: ["extension/tests/**/*.ts"],
    rules: {
      "no-empty-pattern": "off",
    },
  },
);

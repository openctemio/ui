import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore coverage and sentry configs
    "coverage/**",
    "sentry-configs/**",
  ]),
  // Global rules
  {
    rules: {
      // Allow underscore-prefixed unused vars (intentional pattern for future use)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Allow setState in effects - common pattern for syncing with external state
      // (localStorage, cookies, server data). React Compiler handles this well.
      "react-hooks/set-state-in-effect": "off",
      // TanStack Table returns functions that can't be memoized - this is expected
      // The React Compiler handles this gracefully by skipping memoization
      "react-hooks/incompatible-library": "off",
    },
  },
  // Allow <img> in image upload components (for user-uploaded content)
  {
    files: ["**/image-upload.tsx", "**/image-upload.jsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Allow `any` in test files (mocking often requires it)
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;

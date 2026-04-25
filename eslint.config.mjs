import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// `eslint-config-next` already registers the `jsx-a11y` plugin, so we re-use
// its `recommended` flat preset by spreading only the rules and languageOptions
// — including its `plugins` key would cause "Cannot redefine plugin jsx-a11y".
const jsxA11yRecommended = {
  name: jsxA11y.flatConfigs.recommended.name,
  languageOptions: jsxA11y.flatConfigs.recommended.languageOptions,
  rules: jsxA11y.flatConfigs.recommended.rules,
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsxA11yRecommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "jsx-a11y/anchor-is-valid": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

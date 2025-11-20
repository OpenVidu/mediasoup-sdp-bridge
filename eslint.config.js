const globals = require("globals");
const jsConfigs = require("@eslint/js").configs;
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const jestPlugin = require("eslint-plugin-jest");

const baseJsConfig = jsConfigs.recommended;
const tsRecommendedRules = tsPlugin.configs.recommended.rules;
const jestRecommendedRules = jestPlugin.configs.recommended.rules;

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: ["lib/**", "coverage/**"],
  },
  {
    ...baseJsConfig,
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ...baseJsConfig.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsRecommendedRules,
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      ...jestRecommendedRules,
    },
  },
];

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
    // A byte-identical copy of the Choir Practice app, vendored so the demo on
    // this site is the real thing rather than a retelling of it. Linting it here
    // would invite edits, and edits are the one thing it must not have — the copy
    // is checked against its source repository by tests/rendered-html.test.mjs.
    "public/demos/choir/**",
  ]),
]);

export default eslintConfig;

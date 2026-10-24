import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Only application source is linted. Everything below is generated,
    // vendored, or third-party and carries its own rules.
    ignores: [
      "dist",
      "dist-ssr",
      "node_modules",
      // Playwright's bundled npm package inside the scratch venv
      "scratch",
      ".venv",
      "tmp_media",
      // Cloned skill repos and agent tooling
      "opencode-skills",
      ".agents",
      ".claude",
      ".codex",
      ".cook",
      ".impeccable",
      ".archify",
      ".zcode",
      ".tmp",
      ".planning",
      "graphify-out",
      // Test and report output
      "test-results",
      "playwright-report",
      "blob-report",
      "docs",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // tsconfig runs with strict:false and noImplicitAny:false. The resolver
      // parses untyped yt-dlp, Simkl, and Trakt payloads, where `any` is a
      // deliberate choice rather than an oversight. Keep it visible, do not
      // block on it.
      "@typescript-eslint/no-explicit-any": "warn",
      // An empty catch is intentional in the resolver: a failed probe must
      // not abort the whole lookup.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  }
);

import { defineConfig } from "vitest/config";

// Root-level runner for pure, framework-free security/validation logic —
// input sanitizers, path/extension allowlists, webhook payload validators —
// plus a handful of .tsx rendering-safety tests (e.g. proving JSX text
// interpolation escapes an XSS payload) that only need react-dom/server, not
// a full DOM/jsdom environment. These are plain TS/TSX with no Next.js
// -runtime dependency, so a single Node-based Vitest run covers apps/web,
// packages/shared, and supabase/functions without needing per-app test infra.
export default defineConfig({
  test: {
    include: [
      "apps/web/**/*.test.ts",
      "apps/web/**/*.test.tsx",
      "apps/marketing/**/*.test.ts",
      "packages/shared/**/*.test.ts",
      "supabase/functions/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});

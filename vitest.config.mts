import { defineConfig } from "vitest/config";

// Root-level runner for pure, framework-free security/validation logic —
// input sanitizers, path/extension allowlists, webhook payload validators.
// These are plain TS with no Next.js/Deno-runtime imports, so a single
// Node-based Vitest run covers apps/web, packages/shared, and
// supabase/functions without needing per-app test infra.
export default defineConfig({
  test: {
    include: [
      "apps/web/**/*.test.ts",
      "apps/marketing/**/*.test.ts",
      "packages/shared/**/*.test.ts",
      "supabase/functions/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});

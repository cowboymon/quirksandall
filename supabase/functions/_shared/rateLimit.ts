import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Deno-side counterpart to apps/web/app/lib/rateLimit.ts and
// apps/marketing/app/lib/rateLimit.ts — same durable, Postgres-backed
// rate_limit_hits table, same semantics, kept as a separate copy here
// because Supabase Edge Functions (Deno) can't import from
// packages/shared/@quirksandall/shared (see the note in rotate-link/index.ts
// about inlining isUnlocked() for the same reason). Import via a relative
// path from any function in this directory: `../_shared/rateLimit.ts`.

export async function checkRateLimit(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("key", key)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= max) return false;

  await supabase.from("rate_limit_hits").insert({ bucket, key });

  await supabase
    .from("rate_limit_hits")
    .delete()
    .eq("bucket", bucket)
    .eq("key", key)
    .lt("created_at", windowStart);

  return true;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
}

// Same purpose as rateLimitEnv() in the two Next.js apps' rateLimit.ts —
// lets ops tune a limit per deployment via `supabase secrets set` without a
// redeploy of the function's compiled code.
export function rateLimitEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// A dedicated service-role client for rate-limit bookkeeping — every caller
// of these edge functions already creates its own service-role client for
// the main DB work; this one is specifically for the rate_limit_hits table
// so a caller doesn't need to thread its own client through if it hasn't
// created one yet at the point the limit needs checking.
export function rateLimitClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

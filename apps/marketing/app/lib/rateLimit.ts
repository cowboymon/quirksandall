import type { SupabaseClient } from "@supabase/supabase-js";

// Durable, cross-instance rate limiter backed by the rate_limit_hits table
// (service-role only). Unlike an in-memory Map, this survives cold starts
// and multiple concurrent serverless instances, so it can't be bypassed by
// just retrying until you land on a fresh one.
//
// Returns true if the call is allowed (and records it), false if the
// bucket+key is over the limit for the window.
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

  // Best-effort prune of this bucket+key's own stale rows so the table
  // doesn't grow unbounded — no cron needed, cost is paid by the caller
  // that would've hit the limiter anyway.
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

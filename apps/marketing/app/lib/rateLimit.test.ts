import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, clientIp, rateLimitEnv } from "./rateLimit";

// A minimal in-memory fake of the rate_limit_hits table, implementing just
// the chainable query-builder surface checkRateLimit() actually calls:
//   .from("rate_limit_hits").select("id", {count,head}).eq().eq().gte()
//   .from("rate_limit_hits").insert({bucket, key})
//   .from("rate_limit_hits").delete().eq().eq().lt()
// This lets checkRateLimit()'s real logic run against real (fake) row data,
// rather than mocking the function itself — the test exercises the actual
// count/insert/prune behavior, not a stand-in for it.
type Row = { bucket: string; key: string; created_at: string };

function makeFakeSupabase() {
  let rows: Row[] = [];

  function from(table: string) {
    if (table !== "rate_limit_hits") throw new Error(`unexpected table ${table}`);

    return {
      select(_cols: string, _opts?: { count?: string; head?: boolean }) {
        const filters: { bucket?: string; key?: string; gte?: string } = {};
        const builder = {
          eq(col: "bucket" | "key", val: string) {
            filters[col] = val;
            return builder;
          },
          gte(_col: string, val: string) {
            filters.gte = val;
            const matched = rows.filter(
              (r) =>
                (filters.bucket === undefined || r.bucket === filters.bucket) &&
                (filters.key === undefined || r.key === filters.key) &&
                r.created_at >= filters.gte!,
            );
            return Promise.resolve({ count: matched.length, data: null, error: null });
          },
        };
        return builder;
      },
      insert(row: { bucket: string; key: string }) {
        rows.push({ ...row, created_at: new Date().toISOString() });
        return Promise.resolve({ data: null, error: null });
      },
      delete() {
        const filters: { bucket?: string; key?: string; lt?: string } = {};
        const builder = {
          eq(col: "bucket" | "key", val: string) {
            filters[col] = val;
            return builder;
          },
          lt(_col: string, val: string) {
            filters.lt = val;
            rows = rows.filter(
              (r) =>
                !(
                  (filters.bucket === undefined || r.bucket === filters.bucket) &&
                  (filters.key === undefined || r.key === filters.key) &&
                  r.created_at < filters.lt!
                ),
            );
            return Promise.resolve({ data: null, error: null });
          },
        };
        return builder;
      },
    };
  }

  return { from, __rows: () => rows } as any;
}

describe("checkRateLimit", () => {
  let supabase: ReturnType<typeof makeFakeSupabase>;

  beforeEach(() => {
    supabase = makeFakeSupabase();
  });

  it("allows normal usage under the limit — legitimate users are not blocked", async () => {
    for (let i = 0; i < 5; i++) {
      const allowed = await checkRateLimit(supabase, "test_bucket", "user-a", 5, 60);
      expect(allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is reached", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(supabase, "test_bucket", "user-a", 5, 60);
    }
    // The 6th call in the same window is over the limit.
    const blocked = await checkRateLimit(supabase, "test_bucket", "user-a", 5, 60);
    expect(blocked).toBe(false);
  });

  it("does not block a DIFFERENT key even while one key is rate limited — one abusive caller can't lock out others", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(supabase, "test_bucket", "attacker-ip", 5, 60);
    }
    expect(await checkRateLimit(supabase, "test_bucket", "attacker-ip", 5, 60)).toBe(false);
    // A different, legitimate key in the same bucket is unaffected.
    expect(await checkRateLimit(supabase, "test_bucket", "normal-user-ip", 5, 60)).toBe(true);
  });

  it("does not block a different BUCKET for the same key — limits are scoped per-endpoint, not global", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(supabase, "waitlist", "1.2.3.4", 5, 60);
    }
    expect(await checkRateLimit(supabase, "waitlist", "1.2.3.4", 5, 60)).toBe(false);
    expect(await checkRateLimit(supabase, "roadmap_suggest", "1.2.3.4", 5, 60)).toBe(true);
  });

  it("does not record a hit for a call that's already over the limit (no unbounded growth from blocked spam)", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(supabase, "test_bucket", "user-a", 5, 60);
    }
    const rowsBefore = supabase.__rows().length;
    await checkRateLimit(supabase, "test_bucket", "user-a", 5, 60);
    await checkRateLimit(supabase, "test_bucket", "user-a", 5, 60);
    expect(supabase.__rows().length).toBe(rowsBefore);
  });

  it("allows a request again once the window has passed (old hits expire)", async () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-01-01T00:00:00.000Z");
      vi.setSystemTime(now);
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(supabase, "test_bucket", "user-a", 3, 10);
      }
      expect(await checkRateLimit(supabase, "test_bucket", "user-a", 3, 10)).toBe(false);

      // Move past the 10s window.
      vi.setSystemTime(new Date(now.getTime() + 11_000));
      expect(await checkRateLimit(supabase, "test_bucket", "user-a", 3, 10)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("clientIp", () => {
  it("takes the first hop of a multi-hop x-forwarded-for header", () => {
    const req = new Request("https://example.com", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace", () => {
    const req = new Request("https://example.com", { headers: { "x-forwarded-for": "  1.2.3.4  " } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    const req = new Request("https://example.com");
    expect(clientIp(req)).toBe("unknown");
  });
});

describe("rateLimitEnv", () => {
  const ENV_KEY = "RATE_LIMIT_TEST_VALUE";

  beforeEach(() => {
    delete process.env[ENV_KEY];
  });

  it("returns the fallback when the env var is unset", () => {
    expect(rateLimitEnv(ENV_KEY, 42)).toBe(42);
  });

  it("returns the parsed env value when set to a valid positive number", () => {
    process.env[ENV_KEY] = "99";
    expect(rateLimitEnv(ENV_KEY, 42)).toBe(99);
  });

  it("falls back for a non-numeric value — a bad config can't silently disable limiting", () => {
    process.env[ENV_KEY] = "not-a-number";
    expect(rateLimitEnv(ENV_KEY, 42)).toBe(42);
  });

  it("falls back for zero/negative values — a limit of 0 or below would mean 'always blocked' or nonsensical", () => {
    process.env[ENV_KEY] = "0";
    expect(rateLimitEnv(ENV_KEY, 42)).toBe(42);
    process.env[ENV_KEY] = "-5";
    expect(rateLimitEnv(ENV_KEY, 42)).toBe(42);
  });
});

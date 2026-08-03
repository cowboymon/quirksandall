-- Generic durable rate-limit ledger, shared by any server route/middleware
-- that needs a per-bucket, per-key sliding-window counter that survives
-- across serverless/edge instances (in-memory Map counters reset per
-- instance and are trivially bypassed by hitting a cold instance).
--
-- bucket = which limiter ("admin_login", "waitlist", "generate_poster", ...)
-- key    = what's being limited (an IP, a token+IP pair, etc.)
--
-- Service-role only — never queried directly by a client, always through a
-- server route/middleware using the service key. Rows are pruned by the
-- caller on each check (see rateLimit.ts) so this table never needs a cron.
create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup_idx
  on rate_limit_hits (bucket, key, created_at desc);

alter table rate_limit_hits enable row level security;

create policy "rate_limit_hits_deny_anon" on rate_limit_hits for all using (false);

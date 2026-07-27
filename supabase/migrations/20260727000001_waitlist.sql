-- Marketing-site launch waitlist — public, pre-launch email capture.
--
-- Distinct from owners.consent_marketing (§8), which is an in-app product-news
-- opt-in for signed-in owners. This table holds pre-launch emails from
-- anonymous site visitors and is written only by the marketing site's server
-- route using the service-role key.
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,          -- unique: a repeat signup is idempotent
  source      text,                           -- 'hero' | 'footer', to measure which converts
  created_at  timestamptz not null default now(),
  notified_at timestamptz                     -- null until the launch email goes out
);

-- RLS on with no policies: anon and authenticated roles get no direct access.
-- The marketing server route writes with the service-role key, which bypasses
-- RLS, so the table is never readable or writable from the client.
alter table public.waitlist enable row level security;

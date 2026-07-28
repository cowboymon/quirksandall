-- Free-text feature suggestions from the public roadmap page. Mirrors the app's
-- "suggest a feature" flow. Written only by the marketing site's server route
-- using the service-role key. Email is optional — captured only so we can follow
-- up on a suggestion if the person wants us to.
create table if not exists public.roadmap_suggestions (
  id         uuid primary key default gen_random_uuid(),
  suggestion text not null,
  email      text,                              -- optional, for follow-up
  created_at timestamptz not null default now()
);

-- RLS on with no policies: only the server route (service-role key) can read
-- or write.
alter table public.roadmap_suggestions enable row level security;

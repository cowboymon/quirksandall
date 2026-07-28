-- Public roadmap up/down votes — anonymous, pre-launch signal on what to build.
--
-- One row per (item_id, voter_id). voter_id is a random id the browser keeps in
-- localStorage; it is not a person and carries no PII. A repeat click upserts
-- (switch up<->down) or, when cleared, the row is deleted. Written only by the
-- marketing site's server route using the service-role key.
create table if not exists public.roadmap_votes (
  id         uuid primary key default gen_random_uuid(),
  item_id    text not null,                       -- slug from the roadmap data module
  voter_id   text not null,                       -- anonymous per-browser id
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, voter_id)                       -- one standing vote per browser per item
);

-- Aggregate lookups filter by item_id.
create index if not exists roadmap_votes_item_idx on public.roadmap_votes (item_id);

-- RLS on with no policies: anon/authenticated get no direct access. Only the
-- marketing server route (service-role key) can read or write.
alter table public.roadmap_votes enable row level security;

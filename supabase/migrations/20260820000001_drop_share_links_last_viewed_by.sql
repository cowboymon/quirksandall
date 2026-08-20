-- share_links.last_viewed_by — dead since the initial schema: intended to
-- record WHO last opened a link, but no code has ever written to it, so it
-- is null on every row. last_viewed_at (the timestamp) and view_count carry
-- the actual view tracking. Confirmed by the 2026-08-20 schema/code audit;
-- the one select referencing it (apps/web p/[token]/page.tsx) was removed in
-- the same commit as this migration.
alter table public.share_links
  drop column if exists last_viewed_by;

-- Stay start date (#20) — companion to duration_preset/ends_at from
-- 20260725000003. Null means "the stay has already begun" (the common
-- set-it-as-they-leave case), so no backfill is needed; only a deliberately
-- future start date is stored.
alter table public.share_links
  add column if not exists starts_at timestamptz;

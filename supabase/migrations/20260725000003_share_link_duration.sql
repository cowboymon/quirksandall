-- Stay duration at share time (Spec §5.1). Per-link, optional, skippable.
-- duration_preset is a fuzzy bucket; ends_at is an optional exact end date set
-- via tap-through. The recipient page shows an orientation line when either is
-- set. (write_closes_at / check-in wiring comes later with the check-ins feature.)
alter table public.share_links
  add column if not exists duration_preset text,  -- 'hours'|'overnight'|'days'|'longer'|null
  add column if not exists ends_at timestamptz;

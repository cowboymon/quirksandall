-- Tracks the last time the owner was shown the "tell your vet who can make
-- decisions" nudge, so it can be throttled (30-day cadence, mirrors the
-- pattern already used for the dashboard's command-freshness nudge) rather
-- than shown every time. Triggered from the stay-duration flow — see
-- dashboard.tsx's DurationModal onSave — since setting/changing a stay length
-- is the app's actual "this is a new trip" signal.
alter table public.owners
  add column if not exists decision_contact_nudge_shown_at timestamptz;

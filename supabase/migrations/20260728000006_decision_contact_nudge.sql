-- Tracks the last time the owner was shown the "tell your vet who can make
-- decisions" nudge, so it can be throttled (30-day cadence, mirrors the
-- pattern already used for the dashboard's command-freshness nudge) rather
-- than shown every time. Triggered right before the native share sheet opens
-- (dashboard.tsx's shareLinkUrl) — not when the stay length is saved — since
-- most owners share outside the app and don't come back, so that's the last
-- real moment to say it before the handoff happens.
alter table public.owners
  add column if not exists decision_contact_nudge_shown_at timestamptz;

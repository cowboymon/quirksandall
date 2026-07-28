-- Feedback triage: theme (AI-assigned at submit time), a resolution status, and
-- a notified_at stamp so we can track which suggesters still want an update.
alter table public.roadmap_suggestions
  add column if not exists theme       text,
  add column if not exists status      text not null default 'new',   -- new | planned | resolved
  add column if not exists notified_at timestamptz;

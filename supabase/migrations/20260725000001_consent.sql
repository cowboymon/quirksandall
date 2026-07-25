-- Consent infrastructure (Spec v4 §8) — marketing/secondary-use consent.
-- Two layers that must stay consistent:
--   owners.consent_*  → current-state read (what the Settings toggle shows,
--                       and what any "send an offer?" check reads live)
--   consent_log       → append-only audit trail; the evidentiary basis for
--                       lawful processing under GDPR Art. 7(1). If the two ever
--                       diverge, the log wins — the owners columns are a derived
--                       read-model of the latest log row.

-- Current state on owners.
alter table public.owners
  add column if not exists consent_insurance_offers boolean not null default false,
  add column if not exists consent_updated_at       timestamptz,
  add column if not exists consent_policy_version    text;

-- Append-only audit log. A grant or withdrawal is always a NEW row; rows are
-- never updated or deleted. consent_type is text (not a boolean per kind) so
-- future consent types need no migration.
create table if not exists public.consent_log (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.owners(id) on delete cascade,
  consent_type   text not null,          -- 'insurance_offers'
  granted        boolean not null,       -- true = opted in, false = withdrawn
  policy_version text,
  occurred_at    timestamptz not null default now()
);
create index if not exists consent_log_owner_idx
  on public.consent_log (owner_id, occurred_at desc);

alter table public.consent_log enable row level security;

-- Owner may read and append their own consent rows. No update or delete policy
-- is defined, so RLS denies those to everyone (service role still bypasses) —
-- the log stays append-only even to its own owner.
create policy "consent_log_select_own" on public.consent_log
  for select using (auth.uid() = owner_id);
create policy "consent_log_insert_own" on public.consent_log
  for insert with check (auth.uid() = owner_id);

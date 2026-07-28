-- Terms of Use / Privacy Policy acceptance (Issue #96).
-- Required, blocking consent — distinct from the optional marketing/insurance
-- opt-ins in consent.sql/consent_marketing.sql. Recorded once per account so
-- returning users are never re-prompted, unless CONSENT_POLICY_VERSION bumps
-- past what they last accepted.
alter table public.owners
  add column if not exists terms_accepted_at     timestamptz,
  add column if not exists terms_policy_version   text;

-- Same append-only audit trail as the other consent types (consent_log already
-- takes an arbitrary consent_type, so no schema change needed there).
comment on column public.owners.terms_accepted_at is
  'Set once the owner accepts the current Terms of Use / Privacy Policy. Null means never accepted (blocks past the accept-terms screen).';

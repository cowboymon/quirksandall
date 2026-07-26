-- Second consent type (§8): product-marketing opt-in ("Product news & tips").
-- Same pattern as consent_insurance_offers — a current-state column on owners;
-- the append-only consent_log already carries per-type history (consent_type
-- 'marketing') with no further migration.
alter table public.owners
  add column if not exists consent_marketing boolean not null default false;

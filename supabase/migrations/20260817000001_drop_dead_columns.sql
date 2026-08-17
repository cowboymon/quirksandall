-- Schema cleanup — four columns confirmed dead by a full-codebase audit
-- (grepped every read/write across apps/mobile, apps/web, apps/marketing,
-- supabase/functions, packages/shared before including anything here).
--
-- owners.consent_policy_version / owners.terms_policy_version — write-only,
-- superseded by the policy_acceptances table (one row per policy per
-- version, versioned independently — see apps/mobile/lib/policy.ts). These
-- two held a single version for both policies, so bumping Privacy alone
-- could never re-prompt anyone; that's exactly why policy_acceptances
-- replaced them. Nothing has read these two columns since.
--
-- owners.pet_count_limit — zero reads or writes anywhere in application
-- code. Never wired up to any actual pet-count gate.
--
-- owners.purchase_restored_at — zero reads or writes. The restore-purchase
-- flow (lib/purchases.ts) writes purchase_status/unlock_source/unlocked_at/
-- expires_at on a restore, never this column.
--
-- share_links.preset — its own migration (20260720000001) said "UI deferred
-- to a future release, every new link defaults to 'walk'". That release
-- never happened; the column has sat untouched at its default ever since.
alter table public.owners
  drop column if exists consent_policy_version,
  drop column if exists terms_policy_version,
  drop column if exists pet_count_limit,
  drop column if exists purchase_restored_at;

alter table public.share_links
  drop column if exists preset;

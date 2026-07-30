-- Source-agnostic entitlement (partner-licensing spec §5.1, and the annual
-- plan's prerequisite): unlock state is no longer the single boolean
-- purchase_status implies, because a subscription can lapse.
--
--   unlock_source  how this owner got unlocked:
--                    'iap_lifetime' — one-time non-consumable
--                    'iap_annual'   — auto-renewing subscription
--                    (future: 'code' for partner redemptions, 'grant')
--   unlocked_at    when the current unlock began
--   expires_at     null = never (lifetime, open-ended grants);
--                  a date = subscription period end. isUnlocked() in
--                  packages/shared/src/logic.ts is the single reader.
--
-- Written by the RevenueCat webhook (functions/revenuecat-webhook) as the
-- authority, and by the client immediately after purchase as a stopgap so the
-- unlock is instant in-session.

alter table public.owners add column if not exists unlock_source text;
alter table public.owners add column if not exists unlocked_at timestamptz;
alter table public.owners add column if not exists expires_at timestamptz;

-- Backfill: everyone paid before this migration bought the one-time unlock —
-- it was the only product — so they're lifetime, never expiring. This is also
-- what preserves the "once, forever" promise those buyers purchased under.
update public.owners
set unlock_source = 'iap_lifetime'
where purchase_status = 'paid' and unlock_source is null;

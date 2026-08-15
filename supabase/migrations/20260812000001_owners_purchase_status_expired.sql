-- The revenuecat-webhook Edge Function writes purchase_status = 'lapsed' on a
-- subscription's EXPIRATION event (see supabase/functions/revenuecat-webhook/
-- index.ts) — but the original check constraint from the initial schema only
-- ever allowed 'free' or 'paid'. Every real expiration has been failing this
-- write since the webhook was built: Postgres logs show
-- "new row for relation owners violates check constraint
-- owners_purchase_status_check" repeating on every RevenueCat retry.
--
-- 'lapsed' rather than RevenueCat's own event name ('EXPIRATION') — only the
-- webhook event TYPE is RevenueCat's fixed vocabulary; what we store in our
-- own column is ours to choose, and "expired" read oddly applied to an owner
-- row (grammatically implies the person expired, not the subscription).
--
-- No paywall bypass resulted — isUnlocked() in packages/shared/src/logic.ts
-- separately checks expires_at against now() regardless of purchase_status,
-- so a lapsed subscriber still correctly loses access. But purchase_status
-- itself has been silently stuck at 'paid' forever after every real
-- expiration, which is wrong data, and RevenueCat has been retrying a
-- webhook that can never succeed.
alter table public.owners drop constraint owners_purchase_status_check;
alter table public.owners add constraint owners_purchase_status_check
  check (purchase_status in ('free', 'paid', 'lapsed'));

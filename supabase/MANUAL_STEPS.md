# Supabase — manual steps

Things you run in the Supabase dashboard yourself (migrations aren't auto-applied
in this project — paste the SQL into **SQL Editor**, or apply via CLI). Tick as
you go. Newest work is at the top of each section.

> When pasting a migration, paste the **contents** of the `.sql` file, not the
> filename.

---

## ▶️ Run now

- [x] **`20260725000001_consent.sql`** — consent columns on `owners` +
  append-only `consent_log` table + RLS. *(Run 26 Jul 2026.)*

- [x] **`20260724000002_drop_insurance_claims_contact.sql`** — drops the unused
  `claims_contact` key from `pet_vet_info.insurance`. *(Run 26 Jul 2026.)*

- [x] **`20260724000001_routine_left_alone_toileting.sql`** — adds `left_alone`
  + `toileting_frequency` to `pet_routine`. *(Run 26 Jul 2026.)*

## ✉️ Auth (dashboard, not SQL)

- [ ] **OTP sign-in email** — Authentication → Email Templates → **Magic Link**.
  Paste the branded template; set subject to `{{ .Token }} — that's the one`;
  send yourself a test. *(Confirm the hosted logo renders.)*

---

## ⏳ Blocked / future (don't run yet)

- [ ] **Document vault** (Spec §5.4, v1 build item) — ships as a migration when
  the feature is built: a **private** `pet-documents` storage bucket
  (`public = false` — signed URLs with expiry, never public), owner-scoped
  storage RLS, and a `pet_documents` metadata table + RLS. Nothing to create
  by hand; it arrives as SQL like every other migration.

- [ ] **Check-ins** (ships with the sitter-check-in feature) — `check_ins`
  table + `purge_expired_check_ins()` + a daily `pg_cron` schedule for
  retention. Depends on the §7.1 `share_links` column extension
  (`write_closes_at` etc.) landing first.

- [ ] **Analytics vendor** — once PostHog/Mixpanel is chosen, add it to the
  privacy-policy third-party table before publishing.

- [ ] **Legal → policy version** — when the consent / secondary-use section of
  the privacy policy is finalised, bump `CONSENT_POLICY_VERSION` in
  `packages/shared/src/tokens.ts` from `draft-2026-07` to the published
  version. Every consent write after that records the new version; existing
  `consent_log` rows keep the version they were made under.

## ⚙️ Optional env

- [ ] **`PIN_UNLOCK_SECRET`** (Vercel/Supabase env) — dedicated signing secret
  for the persisted-PIN-unlock cookie (#87). **Optional** — it falls back to
  `SUPABASE_SERVICE_KEY` if unset, so nothing breaks without it.

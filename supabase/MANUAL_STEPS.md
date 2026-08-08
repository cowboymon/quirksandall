# Supabase — manual steps

Things you run in the Supabase dashboard yourself (migrations aren't auto-applied
in this project — paste the SQL into **SQL Editor**, or apply via CLI). Tick as
you go. Newest work is at the top of each section.

> When pasting a migration, paste the **contents** of the `.sql` file, not the
> filename.

---

## ▶️ Run now

- [ ] **`20260808000001_share_link_starts_at.sql`** — adds `starts_at` to
  `share_links` for the stay start date (#20). **Required before the new
  "From" field in the stay-duration sheet saves.**

- [x] **`20260806000001_lock_down_trigger_function_grants.sql`** — revokes
  the default `PUBLIC` execute grant on `handle_new_user()` (and
  `rls_auto_enable()` if present) so Supabase's security advisor no longer
  flags them as client-callable. Trigger-only functions, no behavior change.
  Also see the note on `storage.pet-photos` "allows listing" in AGENTS.md —
  intentionally accepted, not fixed by a migration. *(Run 8 Aug 2026.)*

- [x] **`20260804000002_storage_bucket_limits.sql`** — sets `file_size_limit` +
  `allowed_mime_types` on the `pet-photos`/`pet-documents` buckets so Supabase
  Storage itself rejects oversized/wrong-type uploads. *(Run 3 Aug 2026.)*

- [x] **`20260804000001_pet_documents_content_hash.sql`** — adds
  `content_hash` to `pet_documents` for duplicate-upload detection.
  *(Run 3 Aug 2026.)*

- [x] **`20260803000002_roadmap_suggestion_theme_check.sql`** — DB-level
  `CHECK` constraint restricting `roadmap_suggestions.theme` to the fixed
  allowlist. *(Run 3 Aug 2026.)*

- [x] **`20260803000001_rate_limit_hits.sql`** — durable, cross-instance rate
  limiter table. **Required** for admin-login, waitlist, roadmap-suggestion,
  pin-resume, and generate-poster rate limiting to actually work — without
  this table those routes fail open (no limiting) rather than erroring.
  *(Run 3 Aug 2026.)*

- [ ] **`20260725000004_consent_marketing.sql`** — adds `consent_marketing` to
  `owners` for the "Product news & tips" opt-in. **Required before that toggle
  works.**

- [ ] **`20260725000003_share_link_duration.sql`** — adds `duration_preset` +
  `ends_at` to `share_links` for stay duration (§5.1). **Required before the
  "stay length" control + recipient banner work.**

- [ ] **`20260725000002_document_vault.sql`** — private `pet-documents` storage
  bucket + owner-scoped storage RLS + `pet_documents` metadata table + RLS.
  **Required before the Documents screen works** — uploads/reads hit the new
  bucket and table.

- [x] **`20260725000001_consent.sql`** — consent columns on `owners` +
  append-only `consent_log` table + RLS. *(Run 26 Jul 2026.)*

- [x] **`20260724000002_drop_insurance_claims_contact.sql`** — drops the unused
  `claims_contact` key from `pet_vet_info.insurance`. *(Run 26 Jul 2026.)*

- [x] **`20260724000001_routine_left_alone_toileting.sql`** — adds `left_alone`
  + `toileting_frequency` to `pet_routine`. *(Run 26 Jul 2026.)*

## ✉️ Auth (dashboard, not SQL)

- [x] **OTP sign-in email** — Authentication → Email Templates → **Magic Link**.
  Paste `supabase/email-templates/magic-link.html` (now version-controlled);
  set subject to `{{ .Token }} — that's the one`; send yourself a test.
  *(Confirm the hosted logo renders — the image lives in the project's public
  `brand` storage bucket, so a new project needs `email-header-1x.webp`
  re-uploaded there.)* *(Applied to the Sydney project 6 Aug 2026.)*

---

## ⏳ Blocked / future (don't run yet)

- [ ] **Check-ins** (ships with the sitter-check-in feature) — `check_ins`
  table + `purge_expired_check_ins()` + a daily `pg_cron` schedule for
  retention. Depends on the §7.1 `share_links` column extension
  (`write_closes_at` etc.) landing first.

- [ ] **Mixpanel → privacy policy** — Mixpanel is now wired (mobile + web).
  Before publishing the privacy policy, add Mixpanel to the third-party table.

- [ ] **Legal → policy version** — when the consent / secondary-use section of
  the privacy policy is finalised, bump `CONSENT_POLICY_VERSION` in
  `packages/shared/src/tokens.ts` from `draft-2026-07` to the published
  version. Every consent write after that records the new version; existing
  `consent_log` rows keep the version they were made under.

## ⚙️ Env

- [ ] **`EXPO_PUBLIC_MIXPANEL_TOKEN`** (mobile env / EAS build) =
  `55b7deb128adfacb3ba5c8846f4ddfd5` — Mixpanel project token. Public client
  token; analytics is a no-op until it's set.
- [ ] **`NEXT_PUBLIC_MIXPANEL_TOKEN`** (Vercel env) = same value — for the web
  recipient page's `recipient_page_viewed` event.
- [ ] **`PIN_UNLOCK_SECRET`** (Vercel/Supabase env) — dedicated signing secret
  for the persisted-PIN-unlock cookie (#87). **Optional** — it falls back to
  `SUPABASE_SERVICE_KEY` if unset, so nothing breaks without it.

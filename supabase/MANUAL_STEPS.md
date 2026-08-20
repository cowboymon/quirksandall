# Supabase — manual steps

Things you run in the Supabase dashboard yourself (migrations aren't auto-applied
in this project — paste the SQL into **SQL Editor**, or apply via CLI). Tick as
you go. Newest work is at the top of each section.

> When pasting a migration, paste the **contents** of the `.sql` file, not the
> filename.
>
> **Tick it as soon as you run it.** Three entries below sat unticked while
> being live in the database, which makes the list worse than useless — it
> implies working features are broken and invites re-running migrations. To
> check reality rather than trusting this file, query
> `information_schema.columns` / `to_regclass()` for the objects a migration
> creates.

---

## ▶️ Run now

- [x] **Redeploy the `pin-check` edge function** — `supabase functions deploy
  pin-check` (from repo root, with the project linked). The 2026-08-20
  security fixes (link-expiry/archived-pet enforcement + per-link
  brute-force cap) only take effect on the deployed copy once it's pushed;
  the web API routes ship automatically with the next Vercel deploy, this
  one doesn't.

- [x] **`20260820000001_drop_share_links_last_viewed_by.sql`** — drops
  `share_links.last_viewed_by`, dead since the initial schema (never
  written anywhere, null on every row; `last_viewed_at` + `view_count`
  carry the real view tracking — confirmed by the 2026-08-20 audit).
  The one code reference (a select in the web recipient page) was removed
  in the same commit, so run order doesn't matter, but run it soon so the
  schema matches the migration files.

- [x] **`20260817000002_policy_acceptances_cascade.sql`** — **important,
  affects the account-deletion purge.** `policy_acceptances.user_id`
  referenced `auth.users(id)` without `on delete cascade`, discovered when
  a manual `delete from auth.users` failed with a FK violation. The daily
  `purge-scheduled-deletions` cron runs the identical delete — any account
  with a `policy_acceptances` row (most/all real users) has plausibly been
  silently failing to actually purge for the full 30+ days it's been
  running, since pg_cron logs a failed run but doesn't alert anyone or
  disable the schedule. After running this migration, verify with
  `select * from cron.job_run_details where jobname = 'purge-scheduled-deletions' order by start_time desc limit 5;`
  — check `status` is `succeeded`, not `failed`, on the next run. If any
  accounts are currently stuck with an old `deletion_scheduled_at` that
  never actually purged, this migration fixes the constraint but doesn't
  retroactively re-run the job for them — the next nightly run (03:00)
  will catch them once they're past 30 days.

- [x] **`20260817000001_drop_dead_columns.sql`** — drops four columns
  confirmed dead by a full-codebase audit (zero reads anywhere):
  `owners.consent_policy_version`/`terms_policy_version` (superseded by
  `policy_acceptances`), `owners.pet_count_limit`, `owners.purchase_restored_at`,
  and `share_links.preset`. Paired code change already shipped (the three
  writers of the two consent columns stopped writing them). Four other
  write-only columns were considered and deliberately excluded —
  `cancelled_at`, `push_token`, `unlocked_at`, `terms_accepted_at` — since
  each is plausibly staged for a not-yet-shipped feature rather than dead;
  see the audit discussion for the reasoning if revisiting. *(Run 17 Aug
  2026.)*

- [x] **`20260723000002_add_deletion_scheduled.sql`** — adds
  `owners.deletion_scheduled_at` and a daily (03:00) `pg_cron` job
  (`purge-scheduled-deletions`) that hard-deletes `auth.users` rows 30+ days
  past their scheduled deletion, cascading to `owners`/`pets`/etc. Paired with
  the mobile "Delete account" flow (`account.tsx`), which sets
  `deletion_scheduled_at` and shows a "purged in 30 days" message. This
  migration had no tracking entry here despite being live — confirmed via
  `select * from cron.job;` showing `purge-scheduled-deletions` active,
  `0 3 * * *`, matching command. *(Confirmed live 17 Aug 2026.)*

- [x] **`20260812000002_owners_cancelled_at.sql`** — adds `cancelled_at` to
  `owners`, stamped by `revenuecat-webhook/index.ts` on RevenueCat's
  CANCELLATION event (auto-renew turned off — access continues until
  `expires_at`, purchase_status untouched). Previously ignored entirely. For
  an annual plan, `expires_at` can be up to a year after the actual
  cancellation — this is for timing a win-back/discount offer against the
  day they actually decided to leave, not the day access happens to run out.
  *(Run 15 Aug 2026.)*

- [x] **`20260812000001_owners_purchase_status_expired.sql`** — widens the
  `owners_purchase_status_check` constraint to allow `'lapsed'`, matching
  what `revenuecat-webhook/index.ts` already writes on a subscription
  EXPIRATION event. Every real expiration has been failing this write since
  the webhook was built — visible as repeating `owners_purchase_status_check`
  violations in Postgres logs, RevenueCat retrying a webhook call that can
  never succeed. No paywall bypass (`isUnlocked()` checks `expires_at`
  independently), but `purchase_status` has been silently wrong for anyone
  whose subscription actually lapsed. *(Run 15 Aug 2026.)*

- [x] **`20260811000001_share_link_view_count.sql`** — adds `view_count` to
  `share_links` plus the `record_share_link_view(uuid)` RPC the recipient page
  now calls instead of updating `last_viewed_at` directly. `links.ts` selects
  `view_count`, so this had to land before the app next loaded — the same
  breakage the `starts_at` column caused on 10 Aug. *(Run 12 Aug 2026.)*

- [x] **`20260810000001_rename_waitlist_to_marketing.sql`** — renames the
  pre-launch email table `waitlist` → `marketing` (it's now an ongoing
  marketing list, not just a launch waitlist). Coordinated with the code
  change from `.from("waitlist")` to `.from("marketing")`. No column,
  constraint or RLS change. *(Run 10 Aug 2026.)*

- [x] **`20260808000001_share_link_starts_at.sql`** — adds `starts_at` to
  `share_links` for the stay start date (#20). *(Run 10 Aug 2026.)*

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

- [x] **`20260725000004_consent_marketing.sql`** — adds `consent_marketing` to
  `owners` for the "Product news & tips" opt-in. *(Verified applied 10 Aug
  2026.)*

- [x] **`20260725000003_share_link_duration.sql`** — adds `duration_preset` +
  `ends_at` to `share_links` for stay duration (§5.1). *(Verified applied
  10 Aug 2026.)*

- [x] **`20260725000002_document_vault.sql`** — private `pet-documents` storage
  bucket + owner-scoped storage RLS + `pet_documents` metadata table + RLS.
  *(Verified applied 10 Aug 2026.)*

- [x] **`20260725000001_consent.sql`** — consent columns on `owners` +
  append-only `consent_log` table + RLS. *(Run 26 Jul 2026.)*

- [x] **`20260724000002_drop_insurance_claims_contact.sql`** — drops the unused
  `claims_contact` key from `pet_vet_info.insurance`. *(Run 26 Jul 2026.)*

- [x] **`20260724000001_routine_left_alone_toileting.sql`** — adds `left_alone`
  + `toileting_frequency` to `pet_routine`. *(Run 26 Jul 2026.)*

## ✉️ Auth (dashboard, not SQL)

- [x] **OTP sign-in email — dark-mode fix** — re-paste
  `supabase/email-templates/magic-link.html` into Authentication → Email
  Templates → **Magic Link**. Apple Mail was fully inverting every color pair
  (dark card → showed light, light code block → showed dark) because
  `supported-color-schemes` was missing alongside `color-scheme` — Apple Mail
  needs both meta tags together, plus a matching CSS-level
  `:root{color-scheme:light}` declaration, to actually suppress its
  auto-dark-mode inversion. Also added `bgcolor` HTML attributes on the three
  background containers as a second layer, since some Apple Mail versions
  weigh that over the inline `background-color` style. Send yourself a test
  and check it in Apple Mail specifically (the client that broke) —
  Gmail/Outlook weren't confirmed broken but should render unaffected either
  way. *(Original applied to the Sydney project 6 Aug 2026; this fix not yet
  re-pasted.)*

---

## ⏳ Blocked / future (don't run yet)

- [ ] **Marketing send + self-hosted unsubscribe** (ships when we turn the
  marketing send stack on) — send from the Supabase `marketing` list via
  Resend's batch send API rather than Broadcasts, so we own suppression and
  the unsubscribe UX. Build a `/unsubscribe` route on our own domain:
  - Link carries `?e=<email>&t=<hmac>`; token is an HMAC of the email signed
    with a server secret, so it verifies without a DB lookup and can't be
    forged to unsubscribe someone else.
  - On unsubscribe, flip `unsubscribed` in the Supabase `marketing` table
    **and** `PATCH` the Resend audience contact to `unsubscribed: true`.
  - Set `List-Unsubscribe` (pointing at that route) **and**
    `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, and have the
    route accept an unauthenticated **POST** that unsubscribes immediately —
    required for Gmail/Yahoo one-click (RFC 8058) and Spam Act compliance.
  - Supabase stays source of truth; the Resend audience is a mirror. Check
    `unsubscribed` before each batch send.

- [ ] **Check-ins** (ships with the sitter-check-in feature) — `check_ins`
  table + `purge_expired_check_ins()` + a daily `pg_cron` schedule for
  retention. Depends on the §7.1 `share_links` column extension
  (`write_closes_at` etc.) landing first.

- [x] **Missing-pet report → legal docs** — Privacy Policy v1.2 (17 Aug 2026)
  covers the "report missing" feature in §4 (recipient-submitted last-seen
  details, forwarded to the owner by email, not stored) and adds Resend to
  §5. Terms of Service v1.2 (same date) covers it in §6 (recipient's own
  content, unverified). Minor bump on both — no active in-app notice, per
  the changelog page's own minor-vs-major rule. *(Done 17 Aug 2026.)*

- [x] **Mixpanel → privacy policy** — Mixpanel is listed in §5, and Privacy
  Policy v1.1 (12 Aug 2026) covers the recipient page's anonymous view
  tracking in §4 (no account, local identifier, EU processing) to match the
  in-footer notice. Sentry (mobile crash reporting) added to §5 in the same
  version. *(Done 12 Aug 2026.)*

- [ ] **Legal → policy version** — when the consent / secondary-use section of
  the privacy policy is finalised, bump `CONSENT_POLICY_VERSION` in
  `packages/shared/src/tokens.ts` from `draft-2026-07` to the published
  version. Every consent write after that records the new version; existing
  `consent_log` rows keep the version they were made under.

- **Minor vs major on a legal doc** (reference, not a task) — the rule for
  when a Privacy/Terms change is a 1.x clarification vs a 2.0 that needs active
  user notice lives as a comment block in
  `apps/marketing/app/legal/changelog/page.tsx` (above `ChangelogEntry`).
  Short version: if shipping it means we should *tell* or *ask* users, it's a
  2.0; if we're just making the page match what we already do, it's a minor.

## ⚙️ Env

- [ ] **`EXPO_PUBLIC_MIXPANEL_TOKEN`** (mobile env / EAS build) =
  `55b7deb128adfacb3ba5c8846f4ddfd5` — Mixpanel project token. Public client
  token; analytics is a no-op until it's set.
- [ ] **`NEXT_PUBLIC_MIXPANEL_TOKEN`** (Vercel env) = same value — for the web
  recipient page's `recipient_page_viewed` event.
- [ ] **`EXPO_PUBLIC_SENTRY_DSN`** (mobile env / EAS build) — Sentry DSN for
  crash + error reporting. **Optional**: with it unset, `lib/errors.ts` never
  initialises Sentry and every call is a no-op, so dev and CI are unaffected.
  Set it as an EAS secret before the build that ships crash reporting,
  otherwise the build has the native module and reports nothing. A DSN is a
  public client key, not a secret. Org `its-hypothetical`, project `quirks`.
- [ ] **`SENTRY_AUTH_TOKEN`** (EAS secret — **real secret, never commit**) —
  a Sentry *Organization* Auth Token, used only at build time to upload source
  maps. Without it the build still succeeds and crashes still report, but every
  production stack trace stays minified (`index.bundle:1:284729`) instead of
  naming a file and line, which is most of the value gone. Sentry shows the
  token once on creation; if it's lost, delete it and issue a new one.
- [ ] **`PIN_UNLOCK_SECRET`** (Vercel/Supabase env) — dedicated signing secret
  for the persisted-PIN-unlock cookie (#87). **Optional** — it falls back to
  `SUPABASE_SERVICE_KEY` if unset, so nothing breaks without it.
- [x] **`RESEND_API_KEY`** (Vercel env, web app) — **required** for the
  "[Pet name] is missing" flow (`/api/report-missing`) to actually email the
  owner. Without it, a sitter can fill in and submit the missing-pet form and
  it silently fails to alert anyone — the route logs the missing key
  server-side but the only thing a real user sees is a generic "Couldn't send
  the alert" error. Same key as the marketing waitlist's Resend Audience
  sync. *(Set on the web app's Vercel project 17 Aug 2026.)*
- [ ] **`RESEND_FROM_EMAIL`** (Vercel env, web app) — sender address for the
  missing-pet alert email. **Optional** — falls back to
  `Quirks & All <alerts@auth.itshypothetical.com>`, reusing the domain
  already verified in Resend for OTP emails via Supabase's SMTP relay,
  rather than needing a fresh domain verified just for this. First real
  send hit a `403 domain not verified` on the bare `itshypothetical.com`
  root — that's why this isn't the root domain. Revisit with a dedicated
  notification subdomain once volume justifies isolating this stream's
  sender reputation from the OTP domain's.

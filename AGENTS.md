# AGENTS.md

Guidance for AI agents working in this repo.

## Product decisions (v1) — do not reopen without a product call

- **Document vault is owner-side only.** Vaccination / flea-worm documents are
  NEVER rendered on the recipient page and never exposed to a sitter via signed
  URL. Rationale: boarding check-in is almost always the owner at the counter
  with their phone; in-home sitting needs no certificate; sitter-run boarding
  collects proof at booking through its own platform. Enforced in
  `apps/web/app/p/[token]/page.tsx` (documents are not added to the recipient
  profile).

## Manual QA — smoke test before shipping recipient-page changes

- **Medication anchored to an empty meal slot must still render.** Configure a
  medication anchored to Lunch (`edit/routine.tsx`) on a pet with NO lunch feed
  configured. Open the share link (or the owner preview). Confirm: the Lunch
  slot renders in Daily Routine with "Medication only" where the food
  description would sit, the medication line under it, and a "See Medications"
  pointer — even though no lunch food was ever entered. A medication set to
  "Anytime" must NOT create a meal slot anywhere; it only appears in the
  standalone Medications section. Regression risk: the Feeding section's meal
  rows are gated on either food being configured OR a medication being tied to
  that slot (`RecipientView.tsx`'s `FeedingCard`/`hasFeeding`, `preview.tsx`'s
  `meals` filter) — it's easy to accidentally re-gate on food alone and silently
  drop a dose from the sitter's view.

## Security conventions — apply these to new code, not just audits

These came out of four hardening passes (auth, injection/unsafe input, AI/prompt
injection, misconfiguration). The point of writing them down here is that they
apply going forward, not just to the code that was already audited — a new API
route, screen, or edge function should follow these from the start rather than
waiting for the next audit to catch it.

- **Never trust the client to gate access.** Every sensitive server action
  (API route, Server Action, edge function) must check auth/ownership itself,
  even if a UI-level guard also exists. Pattern: `useRequireAuth()`
  (`apps/mobile/hooks/useRequireAuth.ts`) for screens is UX, not security — the
  real gate is server-side RLS + an explicit ownership check
  (`.eq("owner_id", user.id)` or equivalent), matching `set-pin`/`rotate-link`
  in `supabase/functions/`.
- **Admin routes re-check auth themselves**, not just via middleware —
  `isAuthorizedAdmin()` (`apps/marketing/app/lib/adminAuth.ts`), called both in
  `middleware.ts` and inside each `/api/admin/*` route and `admin/page.tsx`. A
  matcher typo must not silently expose an endpoint.
- **Rate-limit every sensitive or expensive endpoint** — login, OTP/PIN
  checks, expensive rendering, public forms, and any write. Use the durable
  Postgres-backed `checkRateLimit()` — `apps/web/app/lib/rateLimit.ts` /
  `apps/marketing/app/lib/rateLimit.ts` for the two Next.js apps,
  `supabase/functions/_shared/rateLimit.ts` for edge functions — never an
  in-memory `Map`, which resets per serverless instance and is trivially
  bypassed by hitting a fresh one.
  - **Always read the threshold/window through `rateLimitEnv()`** (or its
    Deno twin in `_shared/rateLimit.ts`), never a bare numeric literal —
    every limit should be tunable per deployment via an env var
    (`RATE_LIMIT_<THING>_MAX` / `RATE_LIMIT_<THING>_WINDOW_SECONDS`) without a
    code change.
  - **Key the limiter on what actually identifies the caller, not on
    something they can freely rotate.** IP alone is usually right for
    unauthenticated public endpoints. For an authenticated action, key on
    `user.id` (see `set-pin`/`rotate-link`). If a request carries a
    client-generated value (a `voter` id, a nonce), do NOT key on that value
    alone — an attacker mints a fresh one per request for free. Either key
    on IP instead, or require BOTH IP and the client value to pass (see
    `roadmap/route.ts`'s vote limiter) so rotating one alone doesn't reset
    the bucket.
  - **Return 429 when a limit is hit**, with a body that says only "you're
    rate limited," never anything that reveals account/resource state (e.g.
    `pin-check`'s cooldown response is the same shape whether the link
    exists or not — only *whether you're rate limited* is safe to disclose).
  - **An endpoint with no server-owned route can't be rate-limited
    server-side** — mobile's OTP send (`app/auth.tsx`) calls Supabase's
    `signInWithOtp` directly from the client, so the real limit is Supabase's
    own GoTrue throttle, which this codebase doesn't control. The client-side
    resend cooldown there is UX (stop mashing "resend"), not a security
    control — don't mistake one for the other when adding a similar direct
    -to-provider client call.
- **Validate every input server-side** — type, length, format, allowlist.
  Reuse `apps/web/lib/inputSanitize.ts` (free text, image data URIs, header
  filename components) and `packages/shared/src/fileSafety.ts` (file
  extensions, storage path segments) rather than re-deriving ad hoc checks. A
  filename/extension/path segment that influences a storage path must go
  through an allowlist, never a free split-on-`.`.
- **Generic errors to the client, full detail only server-side** — never
  return `error.message`/stack traces from a caught exception. Log with
  `logSupabaseError()` (`apps/marketing/app/lib/logSafe.ts`) rather than the
  raw error object, since Postgres constraint-violation errors can embed the
  submitted value (e.g. an email) in `details`.
- **Guard every `req.json()`** with `.catch(() => null)` (or equivalent) and
  type-check the parsed shape before use — a malformed body must return a
  clean 400, not throw uncaught into the framework's default error handler.
- **New API routes and edge functions inherit the security headers** set in
  `apps/web/next.config.mjs` / `apps/marketing/next.config.mjs`
  (CSP/HSTS/frame-ancestors/etc, applied globally) — if a route needs a new
  external origin (a new analytics vendor, a new API), update the CSP there
  rather than loosening it broadly.
- **Cookies**: `httpOnly: true`, `sameSite: "lax"` (or `"strict"` if it never
  needs cross-site GET), and `secure` should default to `true`/fail-safe
  rather than being gated on an exact `NODE_ENV === "production"` match (see
  `apps/web/app/api/pin-check/route.ts`).
- **Constant-time compare any shared secret** (webhook secrets, admin
  passwords) — never `===`/`!==` on a secret string. See `safeEqual()` in
  `apps/marketing/app/lib/adminAuth.ts` and
  `supabase/functions/revenuecat-webhook/validate.ts`.
- **AI/LLM calls** (currently just `apps/marketing/app/lib/classify.ts`): user
  content is untrusted — never concatenate it into the system prompt, wrap it
  in an explicit delimiter, and instruct the model to treat it as data, not
  instructions. Never trust or store the model's raw output — match it against
  a fixed allowlist (and ideally back that with a DB `CHECK` constraint, as
  `roadmap_suggestions.theme` now has) before it's used for anything.
- **Tests**: this repo now has Vitest (`pnpm test`, root `vitest.config.mts`,
  covering `apps/web`, `apps/marketing`, `packages/shared`,
  `supabase/functions`). New pure validation/security logic should get unit
  tests covering malformed, oversized, and injection-shaped input — see
  `apps/web/lib/inputSanitize.test.ts` or
  `supabase/functions/revenuecat-webhook/validate.test.ts` for the pattern.
- **File uploads** (any new upload feature, not just the two that exist
  today) must, before storing anything:
  - Validate the extension against a strict allowlist
    (`packages/shared/src/fileSafety.ts` — `safeDocumentExtension`/
    `safeImageExtension`), never a free split on the filename.
  - Content-sniff the actual bytes against the claimed type
    (`matchesFileSignature`) — a filename/extension is a claim, not proof.
  - Enforce a size ceiling server-side (`isValidUploadSize` +
    `MAX_IMAGE_UPLOAD_BYTES`/`MAX_DOCUMENT_UPLOAD_BYTES`), and back it with a
    Supabase Storage bucket-level `file_size_limit`/`allowed_mime_types`
    (see the `storage_bucket_limits` migration) so the API itself refuses an
    oversized/wrong-type upload even if application code has a bug.
  - Derive the stored `Content-Type` from the validated extension
    (`contentTypeForExtension`) — never trust a client-supplied
    mimeType/contentType for what gets served back, or an allowlisted file
    can be served as `text/html` and execute in a browser.
  - Generate the storage path server/app-side (owner id + random token +
    validated extension) — never the original filename, and validate every
    path segment with `isSafePathSegment`/`isOwnedStoragePath`.
  - Strip metadata (EXIF/GPS) before storing anything in a **public**
    bucket — re-encode through an image library (`expo-image-manipulator`
    on mobile, `sharp` on the server) rather than uploading the original
    bytes verbatim.
  - A function that mints a signed URL for a private object
    (`documentSignedUrl`-style) should re-verify the path belongs to the
    calling user itself, not only trust that every caller already scoped it
    correctly — RLS is the real enforcement, but the function shouldn't be
    "correct by convention" alone.
  - Never add SVG or HTML to an upload allowlist unless there's a specific,
    reviewed reason — both can execute active content in a browser.
- **XSS**: this app's actual defense is React's JSX auto-escaping — render
  user/DB text as a plain `{value}` child, never via
  `dangerouslySetInnerHTML`, `innerHTML`, or a manual DOM write. There is
  currently no markdown/rich-text renderer anywhere in this codebase — if
  one is ever added, it MUST go through a sanitizer with a strict allowlist
  (e.g. DOMPurify) before rendering, never raw.
  - Text interpolation (`{value}`) is safe **for text nodes**. It is NOT
    safe for a value that becomes an `href`/`src`/redirect target — those
    are browser-interpreted, not just displayed, so a `javascript:`/`data:`
    URL there executes regardless of JSX escaping. Validate any DB/user
    -controlled URL with `isSafeHttpsUrl()` before an `<img src>`/`<a href>`,
    and any DB/user-controlled phone value with `sanitizeTelValue()` before
    a `tel:` href (both in `packages/shared/src/urlSafety.ts`) — even when
    the scheme prefix is a fixed literal your code writes (e.g. `` `tel:${phone}` ``),
    validate/sanitize the value anyway rather than relying on "the prefix
    can't be overridden" as the only defense.
  - The CSP's `script-src 'unsafe-inline'` (both `next.config.mjs` files) is
    NOT a substitute for the above — it's a defense-in-depth layer that
    doesn't block inline-script injection specifically (verified
    empirically: Next.js's own hydration scripts require it, so it can't be
    removed without nonce-based CSP, which nothing here wires up yet). Don't
    treat "we have a CSP" as XSS coverage — the coverage is JSX escaping +
    the two validators above.
  - Auth/session tokens: mobile uses `expo-secure-store` (OS keychain), never
    `AsyncStorage`/`localStorage` — keep it that way for anything
    session-shaped. `localStorage` is fine for genuinely non-sensitive,
    trivially-rotatable values (the anonymous roadmap voter id, Mixpanel's
    own analytics persistence) — know which category a new value falls into
    before reaching for either store.
- **Secrets/env files**: every real `.env`/`.env.local`/`.env.production` (at
  any depth, any app) is gitignored (`.gitignore`'s `.env*` pattern) — only
  `.env.example` files are ever committed, and only with placeholder values,
  never a real key. Keep each app's `.env.example` in sync with what its
  source actually reads (`process.env.X`/`Deno.env.get("X")`) — an
  undocumented required var is config drift, not a leak, but it's the thing
  that leads someone to paste a real value into a committed file "just to
  get it working." Never add a template/example file outside the standard
  `.env.example` name — a second file (like a stray `env.template`) is easy
  to forget belongs to the same gitignore/placeholder discipline.
- **Authorization (as distinct from authentication)**: knowing who's calling
  isn't the same as checking they may act on the specific resource in the
  request. Where this app gets its ownership guarantee differs by layer —
  know which one applies before adding a new query:
  - **Mobile, using the anon-key client under the user's own session**: RLS
    (`for all using (auth.uid() = owner_id)`-style policies, see every
    `*_owner` policy in `supabase/migrations/`) IS the real, sufficient
    boundary — a query filtered by a client-supplied `petId` belonging to
    another owner returns zero rows / is rejected, not an error that leaks
    anything. You don't need an app-level re-check on top of this for a
    plain RLS-covered table.
  - **Any route/function using a service-role client** (`apps/web/app/api/*`,
    `supabase/functions/*`) — RLS is bypassed entirely, so the ONLY
    protection is what the code explicitly checks. Every id used to select
    data must be re-derived from something already verified (a `token`
    resolved from the DB, `getUser()`'s JWT-verified identity), never
    trusted as a standalone client-supplied value. Get the caller's own
    identity from `supabase.auth.getUser()` (Supabase-verified from the JWT),
    never from a `user_id`/`owner_id` field in the request body.
  - **A resource that "doesn't exist" and one that "exists but isn't yours"
    must produce the identical response** — a status-code or body split
    between the two (404 vs 403) becomes an oracle an authenticated caller
    can use to enumerate other accounts' resource ids. Use
    `isOwnedPet()`/`isAuthorizedForLink()`
    (`packages/shared/src/fileSafety.ts` for app code,
    `supabase/functions/_shared/authz.ts` for edge functions) rather than a
    hand-rolled `if (!row) 404 else if (wrong owner) 403` — both paths
    collapse to the same denial by construction.
  - There's no role/permission system to get confused by: admin access is a
    single shared Basic-Auth credential (`isAuthorizedAdmin()`), entirely
    separate from the Supabase user/owners table — there's no `owners.role`
    column, so there's nothing for an authenticated owner to self-promote
    via a normal profile update. If that ever changes (a real role column
    gets added), the same "never trust a client-supplied role value, always
    read it fresh from the DB" rule applies.

None of this is enforced by CI/lint yet — it relies on being followed, not
caught. If a new sensitive route or feature is added, treat this list as the
checklist before considering it done, not just something to fix later in an
audit.

### Database-level: function grants and storage listing

- **`SECURITY DEFINER` trigger functions must not be directly executable by
  `anon`/`authenticated`.** Postgres grants `EXECUTE` on new functions to
  `PUBLIC` by default; a trigger-only function (e.g. `handle_new_user()`,
  called by the `auth.users` insert trigger) never needs a client to call it
  directly, so leaving that default in place is excess privilege with no
  legitimate caller. Revoke it explicitly (see
  `20260806000001_lock_down_trigger_function_grants.sql`) — triggers still
  fire because they execute as the function owner, independent of grants.
- **`storage.pet-photos` is intentionally public-read** (recipient share
  pages fetch photos by CDN URL with no auth) and Supabase's advisor flags
  that as "allows listing" — RLS can't cleanly separate a `GET` of a known
  key from a bucket `LIST`, both go through the same `select` policy. Known
  and accepted: paths are `{owner_id}/{pet_id}.jpg` (UUIDs, not sequential),
  so listing exposes only UUID filenames, not photo content or PII. If this
  bucket ever needs to be genuinely private, that's a bigger change (signed
  URLs, no direct CDN links) — not something to patch around with policy
  tricks.

## Analytics — Mixpanel

Product analytics is **Mixpanel**, wired per the Mixpanel setup skill.

- **Platform / SDKs:** mobile = `mixpanel-react-native` (Expo dev build — native
  module, needs a rebuild after install); web recipient page = `mixpanel-browser`.
- **CDP:** none (direct SDK).
- **Consent:** no EU/CA consent gate — the app is AU-focused, and product
  analytics is covered by the privacy policy (this is separate from, and NOT
  gated by, the insurance-offers consent toggle in Settings).
- **Value Moment:** `share_link_created` — a pet now has a shareable link.

### Where the code lives
- **Mobile wrapper:** `apps/mobile/lib/analytics.ts` — the ONLY file that imports
  Mixpanel. Swapping vendors (e.g. PostHog) is a change here, not at call sites.
  Exposes `initAnalytics`, `track`, `identify`, `setUserProps`, `resetAnalytics`
  and the `AnalyticsEvent` name map.
- **Web wrapper:** `apps/web/app/lib/analytics.ts` — anonymous tracking only
  (recipients are strangers, no `identify`). Exposes `trackWeb` + `WebAnalyticsEvent`.
- **Init:** mobile in `app/_layout.tsx` (on launch); web lazily on first `trackWeb`.
- **Identity:** `identify(user.id)` on OTP verify (`app/auth.tsx`) and app re-open
  (`app/index.tsx`); `resetAnalytics()` on sign-out (`app/account.tsx`).
  `sign_up_completed` fires AFTER `identify`, only for brand-new accounts.

### Tokens (env — never commit)
- Mobile: `EXPO_PUBLIC_MIXPANEL_TOKEN`
- Web: `NEXT_PUBLIC_MIXPANEL_TOKEN`
- Same project token value for both. With no token set, all calls are safe no-ops.

### Events (snake_case — the skill's convention)

Two categories, two different Mixpanel report types. Don't mix them into the
same query — a funnel step is meant to represent one-time forward progress; a
retention event is meant to recur. Putting `session_started` into a **Funnel**
report as "step 1" is the one way this gets confusing — it isn't a conversion
step, it's the "did they come back" signal, and belongs in a **Retention**
report (Day 0 = `sign_up_completed`, return event = `session_started`) or a
daily/weekly unique-users trend instead.

**Funnel events** — each fires once per account, in order, and represents
forward progress. Build the conversion funnel from these only:

| Event | Where | Key props |
|---|---|---|
| `sign_up_completed` | `app/auth.tsx` (new account only) | `platform`, `sign_up_method` |
| `pet_created` | `app/onboarding/step4.tsx` | `platform` |
| `share_link_created` ⭐ Value Moment | `lib/links.ts`, `onboarding/step4.tsx` | `context` (`onboarding`/`dashboard`), `platform` |
| `paywall_viewed` | `app/upgrade.tsx` | `source` |
| `purchase_started` | `app/upgrade.tsx`, `app/account.tsx` | `source` |
| `purchase_completed` | `app/upgrade.tsx`, `app/account.tsx` | `source` |
| `purchase_restored` | `app/upgrade.tsx`, `app/account.tsx` | `source` |

**Engagement / retention events** — recur by design, answer "do they come
back," never a funnel step:

| Event | Where | Key props |
|---|---|---|
| `session_started` | `app/index.tsx` (returning session) + `app/auth.tsx` (fresh login/signup) | `platform`, `source` (`resume`/`login`) |
| `recipient_page_viewed` | `apps/web/.../RecipientView.tsx` | `pin_gated`, `tier` |

### Rules when adding tracking
- **snake_case** event + property names; **lowercase** string values; numerics
  unquoted; no `$`/`mp_` prefixes; **omit** props that don't apply (no nulls/"").
- **Never** send PII or pet content — no names, contacts, PINs, medical text.
  Events describe *actions*, not the sensitive data behind them.
- Add new event names to the `AnalyticsEvent` map, don't inline string literals.
- Place `track()` as close to the triggering action as possible.

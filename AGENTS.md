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
- **Rate-limit anything public that costs money, DB writes, or brute-forceable
  secrets** (login, PIN checks, expensive rendering, public forms) — use the
  durable Postgres-backed `checkRateLimit()`
  (`apps/web/app/lib/rateLimit.ts` / `apps/marketing/app/lib/rateLimit.ts`,
  backed by the `rate_limit_hits` table), not an in-memory `Map` — that resets
  per serverless instance and is trivially bypassed.
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

None of this is enforced by CI/lint yet — it relies on being followed, not
caught. If a new sensitive route or feature is added, treat this list as the
checklist before considering it done, not just something to fix later in an
audit.

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

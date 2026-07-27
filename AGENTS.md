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

# AGENTS.md

Guidance for AI agents working in this repo.

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
| Event | Where | Key props |
|---|---|---|
| `sign_up_completed` | `app/auth.tsx` (new account only) | `platform`, `sign_up_method` |
| `pet_created` | `app/onboarding/step4.tsx` | `platform` |
| `share_link_created` ⭐ Value Moment | `lib/links.ts`, `onboarding/step4.tsx` | `context` (`onboarding`/`dashboard`), `platform` |
| `paywall_viewed` | `app/upgrade.tsx` | `source` |
| `purchase_started` | `app/upgrade.tsx`, `app/account.tsx` | `source` |
| `purchase_completed` | `app/upgrade.tsx`, `app/account.tsx` | `source` |
| `purchase_restored` | `app/upgrade.tsx`, `app/account.tsx` | `source` |
| `recipient_page_viewed` | `apps/web/.../RecipientView.tsx` | `pin_gated`, `tier` |

### Rules when adding tracking
- **snake_case** event + property names; **lowercase** string values; numerics
  unquoted; no `$`/`mp_` prefixes; **omit** props that don't apply (no nulls/"").
- **Never** send PII or pet content — no names, contacts, PINs, medical text.
  Events describe *actions*, not the sensitive data behind them.
- Add new event names to the `AnalyticsEvent` map, don't inline string literals.
- Place `track()` as close to the triggering action as possible.

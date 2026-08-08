# Internal backlog

Parked ideas for the **admin / internal tooling** (not the public roadmap at
`/roadmap`, which is customer-facing). No commitment or timeline — a place so
we don't lose them.

## Feedback board (`/admin` → Feature suggestions)

### Automatic suggester notifications (parked)
Today the notify flow is **track-only**: when a suggestion is set to Planned or
Resolved, anyone who left an email appears in the "To notify" queue with their
address, and we email them by hand, then click **Mark notified**.

Parked upgrade: **send those emails automatically.**
- Wire up an email provider (Resend is the easy fit on Vercel — generous free
  tier, simple API).
- On a status change to Planned/Resolved for a suggestion with an email,
  send a short "we heard you" / "this shipped" note and stamp `notified_at`.
- Keep a manual override + a per-suggester opt-out; don't double-send.
- Needs: `RESEND_API_KEY` (or chosen provider), a verified sending domain,
  and a small template.

### Smaller nice-to-haves (parked)
- Extra status: an **"In progress"** state between Planned and Resolved.
- Status-change history / who-changed-what (currently last-write-wins).
- Bulk actions (e.g. mark a whole theme resolved).
- Merge duplicate suggestions.

## Infrastructure (parked)

### Image/CDN optimization for pet photos + posters (P3, deferred)
Flagged in the build-20 smoke test as the next infrastructure lever once user
volume grows — not urgent pre-launch.
- Serve pet photos and generated posters through a CDN with resized/compressed
  variants instead of full-resolution originals from Supabase Storage.
- Supabase's own Image Transformations (`/render/image` with width/quality
  params) is the lowest-friction first step — no new vendor, works on the
  existing buckets.
- Payoff: faster recipient-page loads on mobile data, lower egress/storage
  cost at scale. Revisit when there's real traffic to measure.

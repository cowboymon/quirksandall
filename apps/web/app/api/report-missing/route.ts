// POST /api/report-missing { token, lastSeenArea, lastSeenDate, lookFor }
//
// A sitter, holding only the share-link token (no account, no auth), reports
// a pet missing. This sends an immediate email to the owner — it does NOT
// generate the poster itself; the client calls /api/generate-poster
// separately with the same fields once this succeeds, so a poster-rendering
// failure never blocks the part that actually matters (the owner finding out).

import { createClient } from "@supabase/supabase-js";
import { peekRateLimit, recordRateLimitHit, clientIp, rateLimitEnv } from "../../lib/rateLimit";
import { sanitizeFreeText } from "../../../lib/inputSanitize";

export const runtime = "nodejs";

const MAX_AREA_LEN = 200;
const MAX_DATE_LEN = 40;
const MAX_LOOKFOR_LEN = 400;

// Generous — this is a safety-critical action that must not get blocked by a
// legitimate retry (bad connection, owner asks "wait, resend it") — but still
// capped so a stolen/leaked link can't be used to spam an owner or run up a
// Resend bill.
const MAX_PER_WINDOW = rateLimitEnv("RATE_LIMIT_REPORT_MISSING_MAX", 5);
const WINDOW_SECONDS = rateLimitEnv("RATE_LIMIT_REPORT_MISSING_WINDOW_SECONDS", 30 * 60);
// Per-token-only daily ceiling, independent of IP — the backstop that
// x-forwarded-for rotation can't dodge. Generous enough for a real crisis
// (several genuinely-worried sitters re-alerting through the day), tight
// enough that the owner can't be email-bombed.
const MAX_PER_TOKEN_PER_DAY = rateLimitEnv("RATE_LIMIT_REPORT_MISSING_TOKEN_DAILY_MAX", 10);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

async function sendOwnerEmail(params: {
  to: string; ownerName: string; petName: string; recipientUrl: string;
  lastSeenArea: string; lastSeenDate: string; lookFor: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  // Reuses the already-verified auth.itshypothetical.com domain (same one
  // OTP emails send from via Supabase's SMTP relay) rather than needing a
  // fresh domain verified in Resend just for this. Revisit once volume/reply
  // expectations justify a dedicated notification domain — see MANUAL_STEPS.md.
  const from = process.env.RESEND_FROM_EMAIL ?? "Quirks & All <alerts@auth.itshypothetical.com>";
  if (!apiKey) {
    console.error("report-missing: RESEND_API_KEY not configured — alert not sent");
    return false;
  }

  const { to, ownerName, petName, recipientUrl, lastSeenArea, lastSeenDate, lookFor } = params;
  const dateLabel = lastSeenDate
    ? new Date(lastSeenDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : "just now";
  const safePet = escapeHtml(petName);

  // Same visual system as the OTP email (magic-link.html): dark crimson
  // envelope, blush card, logo, table-based layout for Outlook/Gmail
  // compatibility, and the same paired color-scheme meta tags + bgcolor
  // attributes — Apple Mail inverted every color pair in the OTP email
  // without those, and this template has the same risk without them.
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${safePet} is missing</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  @media screen and (max-width: 520px) {
    .wrap { padding: 28px 12px !important; }
    .card { padding: 30px 24px 26px 24px !important; }
  }
</style>
</head>
<body bgcolor="#510000" style="margin:0; padding:0; background-color:#510000;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#510000; font-size:1px; line-height:1px;">
    ${safePet} was reported missing — last seen ${escapeHtml(lastSeenArea)}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#510000" style="background-color:#510000;">
    <tr>
      <td align="center" class="wrap" style="padding:48px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; width:100%;">

          <tr>
            <td class="card" bgcolor="#E5BEC4" style="background-color:#E5BEC4; border-radius:16px; padding:40px 32px 36px 32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <img src="https://wlzviqgezwkcyhmofkdt.supabase.co/storage/v1/object/public/brand/email-header-1x.webp" alt="Quirks &amp; All" width="200" style="display:block; border:0; outline:none; text-decoration:none; height:auto;">
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0; font-family:Helvetica,Arial,sans-serif; font-size:26px; line-height:1.2; color:#510000; font-weight:700; letter-spacing:-0.3px;">${safePet} is missing.</p>
              <p style="margin:0 0 24px 0; font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#74555D;">The sitter looking after ${safePet} just reported them missing.</p>

              <!-- Last seen — white sub-card, same pattern the app itself
                   uses (blush page background, white content cards). -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF; border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:4px 0; font-family:Helvetica,Arial,sans-serif; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#74555D; width:90px; vertical-align:top;">Last seen</td>
                        <td style="padding:4px 0; font-family:Helvetica,Arial,sans-serif; font-size:14px; color:#3E0000; font-weight:600;">${escapeHtml(lastSeenArea)} — ${dateLabel}</td>
                      </tr>
                      ${lookFor ? `<tr>
                        <td style="padding:8px 0 0; font-family:Helvetica,Arial,sans-serif; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#74555D; width:90px; vertical-align:top;">Look for</td>
                        <td style="padding:8px 0 0; font-family:Helvetica,Arial,sans-serif; font-size:14px; color:#3E0000; font-weight:600;">${escapeHtml(lookFor)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Owner-facing, deliberately different from the sitter's
                   on-screen checklist — the sitter's steps are what to do
                   standing in the street right now (don't chase, check
                   nearby); the owner's are the things only they can do, so
                   the two don't duplicate effort. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                <tr>
                  <td style="border-top:1px solid #D4A8B2; padding-top:20px;">
                    <p style="margin:0 0 10px 0; font-family:Helvetica,Arial,sans-serif; font-size:11px; line-height:1; color:#510000; text-transform:uppercase; letter-spacing:0.09em; font-weight:700;">What you can do from here</p>
                    <ul style="margin:0; padding-left:18px; font-family:Helvetica,Arial,sans-serif; font-size:13px; line-height:1.7; color:#3E0000;">
                      <li>Call your vet and any microchip registry — flag ${safePet} as missing so a scan anywhere gets matched back to you.</li>
                      <li>Check with local shelters and vet clinics directly by phone — many don't cross-post lost pets online.</li>
                      <li>Post in nearby community/neighbourhood groups — the sitter has a printable poster with ${safePet}'s photo, ask them to share it with you.</li>
                      <li>Stay reachable — the sitter's out looking now and may need to reach you quickly.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Not a big CTA button — this is a fallback for the vet/
                   microchip step above, not the point of the email, so it
                   reads as a plain link rather than competing with the
                   actual content for attention. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px; border-top:1px solid #D4A8B2;">
                <tr>
                  <td style="padding-top:16px;">
                    <a href="${recipientUrl}" style="font-family:Helvetica,Arial,sans-serif; font-size:12px; color:#74555D;">
                      Need the vet's number or microchip details? Grab it from ${safePet}'s web link
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer — same as the OTP email's, so every Quirks & All
                   email reads as one consistent system. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px; border-top:1px solid #D4A8B2;">
                <tr>
                  <td align="center" style="padding-top:20px;">
                    <p style="margin:0 0 3px 0; font-family:Helvetica,Arial,sans-serif; font-size:11px; line-height:1.5; color:#74555D;">quirksandall.itshypothetical.com</p>
                    <p style="margin:0; font-family:Helvetica,Arial,sans-serif; font-size:11px; line-height:1.5; color:#987080;">Made by Its Hypothetical</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `${petName} is missing`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("report-missing: Resend send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("report-missing: Resend send error", e);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return Response.json({ ok: false, error: "token required" }, { status: 400 });

    const lastSeenArea = sanitizeFreeText(body.lastSeenArea, MAX_AREA_LEN);
    if (!lastSeenArea) return Response.json({ ok: false, error: "lastSeenArea required" }, { status: 400 });
    const lastSeenDate = sanitizeFreeText(body.lastSeenDate, MAX_DATE_LEN) ?? "";
    const lookFor = sanitizeFreeText(body.lookFor, MAX_LOOKFOR_LEN) ?? "";

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Only a hit that actually results in a sent email should count against
    // this — recording on every attempt meant a run of failed sends (e.g. a
    // misconfigured sender domain) burned the sitter's quota on nothing,
    // leaving them rate-limited with no email ever having gone out.
    //
    // Two layers: the per-token+IP window (normal use), plus a per-token-only
    // daily cap that IP rotation can't dodge — x-forwarded-for is
    // client-influenceable on some hosts, and without this an attacker
    // rotating it could spam the owner with unlimited "pet missing" alerts.
    const rateLimitKey = `${token}:${clientIp(req)}`;
    const tokenDayKey = `${token}:day`;
    const [allowed, tokenAllowed] = await Promise.all([
      peekRateLimit(supabase, "report_missing", rateLimitKey, MAX_PER_WINDOW, WINDOW_SECONDS),
      peekRateLimit(supabase, "report_missing", tokenDayKey, MAX_PER_TOKEN_PER_DAY, 24 * 60 * 60),
    ]);
    if (!allowed || !tokenAllowed) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

    const { data: link } = await supabase
      .from("share_links")
      .select("pet_id, revoked, expires_at")
      .eq("token", token)
      .single();
    if (!link || link.revoked) return Response.json({ ok: false, error: "link not found" }, { status: 404 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return Response.json({ ok: false, error: "link expired" }, { status: 404 });
    }

    const { data: pet } = await supabase.from("pets").select("name, owner_id, status").eq("id", link.pet_id).single();
    if (!pet || (pet as any).status === "archived") return Response.json({ ok: false, error: "pet not found" }, { status: 404 });

    const { data: owner } = await supabase.from("owners").select("name").eq("id", (pet as any).owner_id).single();
    const { data: authUser } = await supabase.auth.admin.getUserById((pet as any).owner_id);
    const ownerEmail = authUser?.user?.email;
    if (!ownerEmail) {
      console.error("report-missing: owner has no resolvable email", (pet as any).owner_id);
      return Response.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const sent = await sendOwnerEmail({
      to: ownerEmail,
      ownerName: (owner as any)?.name ?? "there",
      petName: (pet as any).name ?? "Your pet",
      recipientUrl: `${origin}/p/${token}`,
      lastSeenArea, lastSeenDate, lookFor,
    });
    if (!sent) return Response.json({ ok: false, error: "server_error" }, { status: 500 });

    await Promise.all([
      recordRateLimitHit(supabase, "report_missing", rateLimitKey),
      recordRateLimitHit(supabase, "report_missing", tokenDayKey),
    ]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("report-missing failed", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

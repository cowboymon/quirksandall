// POST /api/report-missing { token, lastSeenArea, lastSeenDate, lookFor }
//
// A sitter, holding only the share-link token (no account, no auth), reports
// a pet missing. This sends an immediate email to the owner — it does NOT
// generate the poster itself; the client calls /api/generate-poster
// separately with the same fields once this succeeds, so a poster-rendering
// failure never blocks the part that actually matters (the owner finding out).

import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, clientIp, rateLimitEnv } from "../../lib/rateLimit";
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

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h1 style="color:#510000;font-size:22px;">${escapeHtml(petName)} is missing</h1>
      <p style="color:#3E0000;font-size:15px;line-height:1.5;">
        The sitter looking after ${escapeHtml(petName)} just reported them missing.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#74555D;font-size:13px;">Last seen</td>
            <td style="padding:6px 0;color:#3E0000;font-size:13px;">${escapeHtml(lastSeenArea)} — ${dateLabel}</td></tr>
        ${lookFor ? `<tr><td style="padding:6px 0;color:#74555D;font-size:13px;">Look for</td>
            <td style="padding:6px 0;color:#3E0000;font-size:13px;">${escapeHtml(lookFor)}</td></tr>` : ""}
      </table>
      <a href="${recipientUrl}" style="display:inline-block;background:#510000;color:#F8ECEE;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
        View full details
      </a>

      <!-- Owner-facing, deliberately different from the sitter's on-screen
           checklist — the sitter's steps are what to do standing in the
           street right now (don't chase, check nearby); the owner's are the
           things only they can do, so the two don't duplicate effort. -->
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5BEC4;">
        <p style="color:#510000;font-size:14px;font-weight:bold;margin:0 0 10px;">What you can do from here</p>
        <ul style="color:#3E0000;font-size:13px;line-height:1.6;margin:0;padding-left:18px;">
          <li>Call your vet and any microchip registry — flag ${escapeHtml(petName)} as missing so a scan anywhere gets matched back to you.</li>
          <li>Check with local shelters and vet clinics directly by phone — many don't cross-post lost pets online.</li>
          <li>Post in nearby community/neighbourhood groups — the sitter has a printable poster with ${escapeHtml(petName)}'s photo, ask them to share it with you.</li>
          <li>Stay reachable — the sitter's out looking now and may need to reach you quickly.</li>
        </ul>
      </div>
    </div>
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

    const allowed = await checkRateLimit(supabase, "report_missing", `${token}:${clientIp(req)}`, MAX_PER_WINDOW, WINDOW_SECONDS);
    if (!allowed) return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });

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

    return Response.json({ ok: true });
  } catch (err) {
    console.error("report-missing failed", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

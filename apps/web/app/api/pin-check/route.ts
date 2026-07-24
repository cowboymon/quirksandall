import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PIN_MAX_ATTEMPTS, PIN_WINDOW_MINUTES } from "@quirksandall/shared";
import { compareSync } from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Client created per-request so builds don't require env vars at import time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const { token, pin } = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (!token || !pin || pin.length !== 4) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // Resolve link
  const { data: link } = await supabase
    .from("share_links")
    .select("id, pin_hash, revoked, pet_id")
    .eq("token", token)
    .single();

  if (!link || link.revoked) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  // Rate limit check: count recent attempts for this link+ip in the window
  const windowStart = new Date(Date.now() - PIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("pin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("link_id", link.id)
    .eq("ip", ip)
    .gte("attempted_at", windowStart);

  if ((count ?? 0) >= PIN_MAX_ATTEMPTS) {
    return NextResponse.json({ success: false, cooldown: true });
  }

  // Check PIN — bcrypt (salted, slow); a 4-digit PIN must never sit behind
  // a fast unsalted hash
  const correct = !!link.pin_hash && compareSync(pin, link.pin_hash);

  // Log attempt
  await supabase.from("pin_attempts").insert({
    link_id: link.id,
    ip,
    success: correct,
    attempted_at: new Date().toISOString(),
  });

  if (!correct) {
    return NextResponse.json({ success: false });
  }

  // Fetch emergency contacts with separate reads (embeds were returning empty
  // relations, which surfaced nothing after unlock).
  const { data: pet } = await supabase.from("pets").select("owner_id").eq("id", link.pet_id).single();
  const [{ data: ownerRow }, { data: vetRow }] = await Promise.all([
    supabase.from("owners").select("name, primary_phone, backup_contacts").eq("id", pet?.owner_id).single(),
    supabase.from("pet_vet_info").select("primary_vet, emergency_vet, insurance, vet_pre_auth").eq("pet_id", link.pet_id).maybeSingle(),
  ]);
  const vetInfo = (vetRow ?? {}) as any;
  const owner = (ownerRow ?? {}) as any;
  const ins = vetInfo.insurance ?? {};

  return NextResponse.json({
    success: true,
    contacts: {
      primaryVet: {
        contactName: vetInfo.primary_vet?.contact_name ?? "",
        clinic: vetInfo.primary_vet?.clinic ?? "",
        phone: vetInfo.primary_vet?.phone ?? "",
      },
      emergencyVet: vetInfo.emergency_vet ?? {},
      insurance: { provider: ins.provider ?? "", policyNumber: ins.policy_number ?? "", claimsContact: ins.claims_contact ?? "" },
      ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
      backupContacts: owner.backup_contacts ?? [],
      vetPreAuth: vetInfo.vet_pre_auth ?? false,
    },
  });
}

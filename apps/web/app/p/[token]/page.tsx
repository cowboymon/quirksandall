import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { RecipientProfile } from "@quirksandall/shared";
import { isUnlocked } from "@quirksandall/shared";
import LinkUnavailable from "../../components/LinkUnavailable";
import RecipientView from "./RecipientView";
import { fetchEmergencyContacts } from "../../lib/emergency";
import { unlockCookieName, verifyUnlock } from "../../lib/unlock";

// Never cache the recipient page — a revoked link or freshly edited profile must
// take effect immediately.
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Supabase reads go through fetch(); Next's Data Cache would otherwise memoize
// those GETs and serve a point-in-time snapshot of the profile even on a dynamic
// route. Opt every fetch out so the recipient page always reflects live data.
export const fetchCache = "force-no-store";

// A Supabase client whose underlying fetch never hits Next's Data Cache. Without
// this, an edited profile keeps rendering the version cached at first view.
function liveClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

// Names for the "no longer available" screen — resolved even for a
// revoked/expired link or archived pet so the message can be personalised.
async function unavailableInfo(token: string): Promise<{ petName: string; ownerName: string }> {
  const supabase = liveClient();
  const { data: link } = await supabase.from("share_links").select("pet_id").eq("token", token).maybeSingle();
  if (!link) return { petName: "", ownerName: "" };
  const { data: pet } = await supabase.from("pets").select("name, owner_id").eq("id", link.pet_id).maybeSingle();
  if (!pet) return { petName: "", ownerName: "" };
  const { data: owner } = await supabase.from("owners").select("name").eq("id", (pet as any).owner_id).maybeSingle();
  return { petName: (pet as any).name ?? "", ownerName: (owner as any)?.name ?? "" };
}

async function fetchProfile(token: string, logView = true, preview = false): Promise<RecipientProfile | null> {
  const supabase = liveClient();

  // Resolve the share link
  const { data: link } = await supabase
    .from("share_links")
    .select("id, pet_id, mode, revoked, expires_at, pin_hash, last_viewed_at, last_viewed_by, duration_preset, starts_at, ends_at")
    .eq("token", token)
    .single();

  if (!link || link.revoked) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  // Fetch identity from the pets table, then each child table separately. A
  // single multi-embed query was silently returning empty relations on the live
  // DB, so nothing but identity rendered — separate reads are robust.
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, species, breed, dob, dob_is_estimated, sex, weight, color_markings, photo_url, microchip_number, updated_at, owner_id, status")
    .eq("id", link.pet_id)
    .single();

  // A deleted (archived) pet's links must stop working, like a revoked link.
  if (!pet || (pet as any).status === "archived") return null;

  const [{ data: ownerRow }, { data: behaviorRow }, { data: medicalRow }, { data: routineRow }, { data: vetRow }] = await Promise.all([
    supabase.from("owners").select("purchase_status, expires_at, name, primary_phone, backup_contacts").eq("id", pet.owner_id).single(),
    supabase.from("pet_behavior").select("commands, quirks_triggers, escape_risk, scared, no_go, flight_risk, temperament_summary").eq("pet_id", pet.id).maybeSingle(),
    supabase.from("pet_medical").select("allergies, conditions, medications").eq("pet_id", pet.id).maybeSingle(),
    supabase.from("pet_routine").select("feeding, walks, sleep, bathroom_habits, left_alone, toileting_frequency").eq("pet_id", pet.id).maybeSingle(),
    supabase.from("pet_vet_info").select("primary_vet, emergency_vet, insurance").eq("pet_id", pet.id).maybeSingle(),
  ]);

  const owner = (ownerRow ?? {}) as any;
  const isPaid = isUnlocked(owner);
  const behavior = (behaviorRow ?? {}) as any;
  const medical = (medicalRow ?? {}) as any;
  const routine = routineRow as any;
  const vetInfo = vetRow as any;
  const pinSet = !!link.pin_hash;
  // Paid unlock: soft triggers, routine-rest (walks/sleep/bathroom), medical.
  // Feeding, flight risk, commands and allergies stay free at every tier. The
  // owner's own preview (?preview=1) always receives the paid fields — but the
  // client badges them, so a free owner sees what they'd be unlocking.
  const canSeePaid = isPaid || preview;

  // Persisted unlock (#87): if this device previously entered the correct PIN it
  // holds a signed httpOnly cookie, so render the emergency block already
  // unlocked — no flash of the PIN gate. Re-verified here against the current
  // PIN hash on the (already non-revoked) link, so a revoked link or changed PIN
  // re-locks immediately.
  let unlockedContacts: Awaited<ReturnType<typeof fetchEmergencyContacts>> | null = null;
  if (pinSet && verifyUnlock(token, link.pin_hash!, cookies().get(unlockCookieName(token))?.value)) {
    unlockedContacts = await fetchEmergencyContacts(supabase, pet.id);
  }

  // Log view (fire and forget) — never count an owner preview as a real view.
  // The RPC stamps last_viewed_at and increments view_count in one statement,
  // so simultaneous views can't clobber each other's increment.
  if (logView && !preview) {
    supabase.rpc("record_share_link_view", { p_link_id: link.id }).then(() => {});
  }

  // Compute age
  const { computeAge, orderedCommands, stayStatus } = await import("@quirksandall/shared");
  const age = computeAge(pet.dob, pet.dob_is_estimated);
  // Stay-duration orientation (§5.1) — only the owner-set phrase, no raw dates
  // beyond the friendly "until …" form. Owner previews don't show it.
  const stayNote = preview ? null : stayStatus(pet.name ?? "", (link as any).duration_preset, (link as any).ends_at, (link as any).starts_at);

  // PRODUCT DECISION (v1, do not reopen without a product call): the document
  // vault is owner-side only. Vaccination/flea-worm documents are deliberately
  // NOT added to the recipient profile and never exposed to a sitter via signed
  // URL — boarding check-in is almost always the owner in person, in-home
  // sitting needs no certificate, and sitter-run boarding collects proof through
  // its own booking platform. See AGENTS.md "Product decisions".
  const profile: RecipientProfile = {
    pet: {
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      photoUrl: pet.photo_url,
      microchipNumber: pet.microchip_number,
      sex: pet.sex,
      weight: pet.weight,
      colorMarkings: pet.color_markings,
    },
    age,
    behavior: {
      commands: orderedCommands(behavior.commands ?? [], isPaid, false),
      quirksTriggers: behavior.quirks_triggers ?? [],
      // Flight/escape risk is a safety override — always free.
      escapeRisk: behavior.escape_risk ?? { flag: false, notes: "" },
      flightRisk: behavior.flight_risk ?? "",
      // Soft behavioural colour — paid tier only (withheld from a free payload).
      scared: canSeePaid ? behavior.scared ?? "" : "",
      noGo: canSeePaid ? behavior.no_go ?? "" : "",
      temperamentSummary: canSeePaid ? behavior.temperament_summary ?? "" : "",
    },
    allergies: medical.allergies ?? [],
    pinSet,
    // When a PIN is set, emergencyContacts is populated client-side only after
    // the sitter enters it (via the pin-check route) — unless this device has a
    // persisted unlock (#87), in which case we surface it server-side here. When
    // NO pin is set there is nothing to protect, so we surface it openly.
    ...(pinSet
      ? (unlockedContacts ? { emergencyContacts: unlockedContacts } : {})
      : {
          emergencyContacts: {
            primaryVet: {
              contactName: vetInfo?.primary_vet?.contact_name ?? "",
              clinic: vetInfo?.primary_vet?.clinic ?? "",
              address: vetInfo?.primary_vet?.address ?? "",
              phone: vetInfo?.primary_vet?.phone ?? "",
            },
            emergencyVet: {
              clinic: vetInfo?.emergency_vet?.clinic ?? "",
              address: vetInfo?.emergency_vet?.address ?? "",
              phone: vetInfo?.emergency_vet?.phone ?? "",
            },
            insurance: { provider: vetInfo?.insurance?.provider ?? "", policyNumber: vetInfo?.insurance?.policy_number ?? "" },
            ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
            // Same consent filter + shape as fetchEmergencyContacts (lib/emergency.ts) —
            // this is the no-PIN free-tier path, which builds the payload inline
            // rather than through that shared helper.
            backupContacts: (owner.backup_contacts ?? [])
              .filter((c: any) => c.consent_to_share)
              .map((c: any) => ({
                name: c.name ?? "",
                relationship: c.relationship ?? "",
                phone: c.phone ?? "",
                consentToShare: !!c.consent_to_share,
                isDecisionContact: !!c.is_decision_contact,
                decisionPriority: c.decision_priority ?? undefined,
              })),
          },
        }),
    lastUpdatedAt: pet.updated_at ?? pet.dob,
    mode: link.mode,
    isPaid,
    preview,
    ...(stayNote ? { stayNote } : {}),
    // Feeding is free at every tier; walks/sleep/bathroom are paid. Always send
    // feeding when a routine row exists; withhold the rest for a free payload.
    ...(routine
      ? {
          routine: {
            feeding: routine.feeding ?? { brand: "", breakfast: { time: "", amount: "" }, lunch: { time: "", amount: "" }, dinner: { time: "", amount: "" }, treats: { type: "", limit: "" }, notes: "" },
            walks: canSeePaid ? routine.walks ?? "" : "",
            sleep: canSeePaid ? routine.sleep ?? "" : "",
            bathroomHabits: canSeePaid ? routine.bathroom_habits ?? "" : "",
            leftAlone: canSeePaid ? (routine.left_alone?.ok ? (routine.left_alone.detail ? `${routine.left_alone.ok} — ${routine.left_alone.detail}` : routine.left_alone.ok) : "") : "",
            toileting: canSeePaid ? routine.toileting_frequency ?? "" : "",
          },
        }
      : {}),
    // Medical (conditions + medications) — free at every tier. Withholding a
    // dog's medication from a sitter because the owner hasn't paid is a
    // safety failure (harm test), so it ships in the free payload like allergies.
    ...(medical
      ? {
          medical: {
            conditions: medical.conditions ?? [],
            // Map the stored (snake_case) medication rows to the camelCase type
            // the view renders, including the meal slot (#94).
            medications: (medical.medications ?? []).map((m: any) => ({
              name: m.name ?? "",
              dose: m.dose ?? "",
              frequency: m.frequency ?? "",
              timeOfDay: m.time_of_day ?? "",
              locationStored: m.location_stored ?? "",
              notes: m.notes ?? "",
              // Legacy rows (pre-#94 follow-up) stored a bare string.
              withMeal: m.with_meal == null ? undefined : Array.isArray(m.with_meal) ? m.with_meal : [m.with_meal],
            })),
          },
        }
      : {}),
  };

  return profile;
}

export async function generateMetadata({ params }: { params: { token: string } }) {
  const profile = await fetchProfile(params.token, false);
  if (!profile) return { title: "Quirks & All" };
  const title = `${profile.pet.name} — Quirks & All`;
  const description = "Away, but known.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(profile.pet.photoUrl ? { images: [{ url: profile.pet.photoUrl }] } : {}),
    },
  };
}

export default async function RecipientPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // ?preview=1 is deliberately NOT honored on the web recipient page — it would
  // let anyone un-gate paid content. The owner previews in the native app.
  const profile = await fetchProfile(params.token, true, false);
  if (!profile) {
    const info = await unavailableInfo(params.token);
    return <LinkUnavailable petName={info.petName} ownerName={info.ownerName} />;
  }
  return <RecipientView profile={profile} token={params.token} />;
}

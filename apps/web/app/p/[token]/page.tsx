import { createClient } from "@supabase/supabase-js";
import type { RecipientProfile } from "@quirksandall/shared";
import LinkUnavailable from "../../components/LinkUnavailable";
import RecipientView from "./RecipientView";

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
    .select("id, pet_id, mode, revoked, expires_at, pin_hash, last_viewed_at, last_viewed_by")
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
    supabase.from("owners").select("purchase_status, name, primary_phone, backup_contacts").eq("id", pet.owner_id).single(),
    supabase.from("pet_behavior").select("commands, quirks_triggers, escape_risk, scared, no_go, flight_risk, temperament_summary").eq("pet_id", pet.id).maybeSingle(),
    supabase.from("pet_medical").select("allergies, conditions, medications").eq("pet_id", pet.id).maybeSingle(),
    supabase.from("pet_routine").select("feeding, walks, sleep, bathroom_habits").eq("pet_id", pet.id).maybeSingle(),
    supabase.from("pet_vet_info").select("primary_vet, emergency_vet, insurance, vet_pre_auth").eq("pet_id", pet.id).maybeSingle(),
  ]);

  const owner = (ownerRow ?? {}) as any;
  const isPaid = owner.purchase_status === "paid";
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

  // Log view (fire and forget) — never count an owner preview as a real view
  if (logView && !preview) {
    supabase
      .from("share_links")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", link.id)
      .then(() => {});
  }

  // Compute age
  const { computeAge } = await import("@quirksandall/shared");
  const age = computeAge(pet.dob, pet.dob_is_estimated);

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
      commands: behavior.commands ?? [],
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
    // the sitter enters it (via the pin-check route). When NO pin is set there
    // is nothing to protect, so we surface the contacts openly here.
    ...(pinSet
      ? {}
      : {
          emergencyContacts: {
            primaryVet: {
              contactName: vetInfo?.primary_vet?.contact_name ?? "",
              clinic: vetInfo?.primary_vet?.clinic ?? "",
              phone: vetInfo?.primary_vet?.phone ?? "",
            },
            emergencyVet: vetInfo?.emergency_vet ?? {},
            insurance: { provider: vetInfo?.insurance?.provider ?? "", policyNumber: vetInfo?.insurance?.policy_number ?? "", claimsContact: vetInfo?.insurance?.claims_contact ?? "" },
            ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
            backupContacts: owner.backup_contacts ?? [],
            vetPreAuth: vetInfo?.vet_pre_auth ?? false,
          },
        }),
    lastUpdatedAt: pet.updated_at ?? pet.dob,
    mode: link.mode,
    isPaid,
    preview,
    // Feeding is free at every tier; walks/sleep/bathroom are paid. Always send
    // feeding when a routine row exists; withhold the rest for a free payload.
    ...(routine
      ? {
          routine: {
            feeding: routine.feeding ?? { brand: "", breakfast: { time: "", amount: "" }, lunch: { time: "", amount: "" }, dinner: { time: "", amount: "" }, treats: { type: "", limit: "" }, notes: "" },
            walks: canSeePaid ? routine.walks ?? "" : "",
            sleep: canSeePaid ? routine.sleep ?? "" : "",
            bathroomHabits: canSeePaid ? routine.bathroom_habits ?? "" : "",
          },
        }
      : {}),
    // Medical (conditions + medications) — paid tier only.
    ...(canSeePaid && medical ? { medical: { conditions: medical.conditions ?? [], medications: medical.medications ?? [] } } : {}),
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

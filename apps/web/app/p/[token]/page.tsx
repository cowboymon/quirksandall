import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { RecipientProfile } from "@quirksandall/shared";
import RecipientView from "./RecipientView";

async function fetchProfile(token: string, logView = true): Promise<RecipientProfile | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Resolve the share link
  const { data: link } = await supabase
    .from("share_links")
    .select("id, pet_id, mode, revoked, expires_at, pin_hash, last_viewed_at, last_viewed_by")
    .eq("token", token)
    .single();

  if (!link || link.revoked) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  // Fetch pet + owner purchase status
  const { data: pet } = await supabase
    .from("pets")
    .select(`
      id, name, species, breed, dob, dob_is_estimated, sex, weight,
      color_markings, photo_url, microchip_number, updated_at,
      owners!inner(purchase_status),
      pet_behavior(commands, quirks_triggers, escape_risk, scared, no_go, flight_risk, temperament_summary),
      pet_medical(allergies, conditions, medications),
      pet_routine(feeding, walks, sleep, bathroom_habits),
      pet_vet_info(primary_vet, emergency_vet, insurance)
    `)
    .eq("id", link.pet_id)
    .single();

  if (!pet) return null;

  const isPaid = (pet as any).owners?.purchase_status === "paid";
  const behavior = (pet as any).pet_behavior?.[0] ?? {};
  const medical = (pet as any).pet_medical?.[0] ?? {};
  const routine = (pet as any).pet_routine?.[0] ?? null;
  const vetInfo = (pet as any).pet_vet_info?.[0] ?? null;

  // Log view (fire and forget)
  if (logView) {
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
      escapeRisk: behavior.escape_risk ?? { flag: false, notes: "" },
      scared: behavior.scared ?? "",
      noGo: behavior.no_go ?? "",
      flightRisk: behavior.flight_risk ?? "",
      temperamentSummary: behavior.temperament_summary ?? "",
    },
    allergies: medical.allergies ?? [],
    // emergencyContacts only populated after PIN unlock (handled client-side via edge function)
    lastUpdatedAt: pet.updated_at ?? pet.dob,
    mode: link.mode,
    isPaid,
    // routine/medical only for paid
    ...(isPaid && routine ? { routine } : {}),
    ...(isPaid && medical ? { medical: { conditions: medical.conditions ?? [], medications: medical.medications ?? [] } } : {}),
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

export default async function RecipientPage({ params }: { params: { token: string } }) {
  const profile = await fetchProfile(params.token);
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[#510000] font-medium">This link's done its job. Ask for a new one.</p>
        </div>
      </main>
    );
  }
  return <RecipientView profile={profile} token={params.token} />;
}

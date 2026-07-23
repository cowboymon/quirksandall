import { createClient } from "@supabase/supabase-js";
import type { RecipientProfile } from "@quirksandall/shared";
import LinkUnavailable from "../../components/LinkUnavailable";
import RecipientView from "./RecipientView";

async function fetchProfile(token: string, logView = true, preview = false): Promise<RecipientProfile | null> {
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
      owners!inner(purchase_status, name, primary_phone, backup_contacts),
      pet_behavior(commands, quirks_triggers, escape_risk, scared, no_go, flight_risk, temperament_summary),
      pet_medical(allergies, conditions, medications),
      pet_routine(feeding, walks, sleep, bathroom_habits),
      pet_vet_info(primary_vet, emergency_vet, insurance, vet_pre_auth)
    `)
    .eq("id", link.pet_id)
    .single();

  if (!pet) return null;

  const owner = (pet as any).owners ?? {};
  const isPaid = owner.purchase_status === "paid";
  const behavior = (pet as any).pet_behavior?.[0] ?? {};
  const medical = (pet as any).pet_medical?.[0] ?? {};
  const routine = (pet as any).pet_routine?.[0] ?? null;
  const vetInfo = (pet as any).pet_vet_info?.[0] ?? null;
  const pinSet = !!link.pin_hash;

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
      escapeRisk: behavior.escape_risk ?? { flag: false, notes: "" },
      scared: behavior.scared ?? "",
      noGo: behavior.no_go ?? "",
      flightRisk: behavior.flight_risk ?? "",
      temperamentSummary: behavior.temperament_summary ?? "",
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
            insurance: vetInfo?.insurance ?? {},
            ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
            backupContacts: owner.backup_contacts ?? [],
            vetPreAuth: vetInfo?.vet_pre_auth ?? false,
          },
        }),
    lastUpdatedAt: pet.updated_at ?? pet.dob,
    mode: link.mode,
    isPaid,
    preview,
    // routine/medical for paid tier — or for the owner's own preview
    ...((isPaid || preview) && routine ? { routine } : {}),
    ...((isPaid || preview) && medical ? { medical: { conditions: medical.conditions ?? [], medications: medical.medications ?? [] } } : {}),
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
  const preview = searchParams.preview === "1";
  const profile = await fetchProfile(params.token, true, preview);
  if (!profile) {
    return <LinkUnavailable />;
  }
  return <RecipientView profile={profile} token={params.token} />;
}

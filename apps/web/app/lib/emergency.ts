import type { SupabaseClient } from "@supabase/supabase-js";

// The emergency-contacts payload returned to the client once the block is
// unlocked. Shared by the pin-check (fresh unlock) and pin-resume (persisted
// unlock) routes so both stay in lockstep. Reads use separate queries because a
// single multi-embed query was silently returning empty relations on the live
// DB.
export async function fetchEmergencyContacts(supabase: SupabaseClient, petId: string) {
  const { data: pet } = await supabase.from("pets").select("owner_id").eq("id", petId).single();
  const [{ data: ownerRow }, { data: vetRow }] = await Promise.all([
    supabase.from("owners").select("name, primary_phone, backup_contacts").eq("id", pet?.owner_id).single(),
    supabase.from("pet_vet_info").select("primary_vet, emergency_vet, insurance").eq("pet_id", petId).maybeSingle(),
  ]);
  const vetInfo = (vetRow ?? {}) as any;
  const owner = (ownerRow ?? {}) as any;
  const ins = vetInfo.insurance ?? {};
  return {
    primaryVet: {
      contactName: vetInfo.primary_vet?.contact_name ?? "",
      clinic: vetInfo.primary_vet?.clinic ?? "",
      address: vetInfo.primary_vet?.address ?? "",
      phone: vetInfo.primary_vet?.phone ?? "",
    },
    emergencyVet: {
      clinic: vetInfo.emergency_vet?.clinic ?? "",
      address: vetInfo.emergency_vet?.address ?? "",
      phone: vetInfo.emergency_vet?.phone ?? "",
    },
    insurance: { provider: ins.provider ?? "", policyNumber: ins.policy_number ?? "" },
    ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
    // Only surface backup contacts the owner explicitly consented to share —
    // the mobile editor's "I have permission to share this person's contact
    // info" checkbox, stored per-contact as consent_to_share.
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
  };
}

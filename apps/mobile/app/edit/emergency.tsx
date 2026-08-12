// Edit emergency contacts + PIN
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { AppAlert } from "../../stores/appAlert";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { LabeledInput, Eyebrow, Card, InlineNote } from "../../components/ui";
import { LabeledPlacesInput } from "../../components/PlacesInput";
import { InsurerInput } from "../../components/InsurerInput";
import CheckboxRow from "../../components/CheckboxRow";
import PINEditor from "../../components/PINEditor";
import { colors } from "@quirksandall/shared";
import { router, useLocalSearchParams } from "expo-router";

export default function EditEmergency() {
  const { pet, petId, loading } = useActivePet();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const pinY = useRef(0);
  const backupY = useRef(0);

  // Deep-links from the dashboard land on the block they're about rather than
  // the top of the screen: "Change PIN" → the PIN editor, the going-away nudge
  // ("Check who's listed") → the backup contacts.
  useEffect(() => {
    if (loading) return;
    const target = section === "pin" ? pinY : section === "backup" ? backupY : null;
    if (!target) return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: target.current, animated: true }), 400);
    return () => clearTimeout(t);
  }, [loading, section]);

  const [vetContactName, setVetContactName] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const [vetAddress, setVetAddress] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [emergClinic, setEmergClinic] = useState("");
  const [emergAddress, setEmergAddress] = useState("");
  const [emergPhone, setEmergPhone] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [backupName, setBackupName] = useState("");
  const [backupRel, setBackupRel] = useState("");
  const [backupPhone, setBackupPhone] = useState("");
  const [backupConsent, setBackupConsent] = useState(false);
  const [backupIsDecisionContact, setBackupIsDecisionContact] = useState(false);
  const [backup2Name, setBackup2Name] = useState("");
  const [backup2Rel, setBackup2Rel] = useState("");
  const [backup2Phone, setBackup2Phone] = useState("");
  const [backup2Consent, setBackup2Consent] = useState(false);
  const [backup2IsDecisionContact, setBackup2IsDecisionContact] = useState(false);
  const [showSecondBackup, setShowSecondBackup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPIN, setShowPIN] = useState(false);
  // Address/phone are locked to whatever a verified search result says;
  // "Can't find your clinic?" is the only way to unlock them for manual
  // entry. Always starts locked, including for already-saved data — editing
  // a saved clinic's address/phone means re-searching or going manual again.
  const [vetManual, setVetManual] = useState(false);
  const [emergManual, setEmergManual] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const [{ data: vet }, { data: owner }] = await Promise.all([
        supabase.from("pet_vet_info").select("*").eq("pet_id", petId).single(),
        supabase.from("owners").select("backup_contacts").eq("id", (await supabase.auth.getSession()).data.session!.user.id).single(),
      ]);
      if (vet) {
        setVetContactName(vet.primary_vet?.contact_name ?? "");
        setVetClinic(vet.primary_vet?.clinic ?? "");
        setVetAddress(vet.primary_vet?.address ?? "");
        setVetPhone(vet.primary_vet?.phone ?? "");
        setEmergClinic(vet.emergency_vet?.clinic ?? "");
        setEmergAddress(vet.emergency_vet?.address ?? "");
        setEmergPhone(vet.emergency_vet?.phone ?? "");
        setInsuranceProvider(vet.insurance?.provider ?? "");
        setInsurancePolicy(vet.insurance?.policy_number ?? "");
      }
      if (owner) {
        const backup = owner.backup_contacts?.[0];
        if (backup) {
          setBackupName(backup.name ?? "");
          setBackupRel(backup.relationship ?? "");
          setBackupPhone(backup.phone ?? "");
          setBackupConsent(backup.consent_to_share ?? false);
          setBackupIsDecisionContact(backup.is_decision_contact ?? false);
        }
        const backup2 = owner.backup_contacts?.[1];
        if (backup2) {
          setBackup2Name(backup2.name ?? "");
          setBackup2Rel(backup2.relationship ?? "");
          setBackup2Phone(backup2.phone ?? "");
          setBackup2Consent(backup2.consent_to_share ?? false);
          setBackup2IsDecisionContact(backup2.is_decision_contact ?? false);
          setShowSecondBackup(true);
        }
      }
    })();
  }, [petId]);

  const save = async () => {
    if (!petId) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not logged in");
      const backups = [
        { name: backupName, relationship: backupRel, phone: backupPhone, consent_to_share: backupConsent, is_decision_contact: backupIsDecisionContact },
        ...(backup2Name || backup2Phone ? [{ name: backup2Name, relationship: backup2Rel, phone: backup2Phone, consent_to_share: backup2Consent, is_decision_contact: backup2IsDecisionContact }] : []),
      ];
      // Priority follows entry order among only the contacts actually marked
      // as a decision contact (1 = call first).
      let priority = 1;
      for (const b of backups) {
        if (b.is_decision_contact) (b as any).decision_priority = priority++;
      }
      const [{ error: vetError }, { error: ownerError }] = await Promise.all([
        supabase.from("pet_vet_info").upsert({
          pet_id: petId,
          primary_vet: { contact_name: vetContactName, clinic: vetClinic, address: vetAddress, phone: vetPhone },
          emergency_vet: { clinic: emergClinic, address: emergAddress, phone: emergPhone },
          insurance: { provider: insuranceProvider, policy_number: insurancePolicy },
        }, { onConflict: "pet_id" }),
        supabase.from("owners").update({ backup_contacts: backups }).eq("id", user.id),
      ]);
      if (vetError || ownerError) throw new Error((vetError ?? ownerError)!.message);
      router.back();
    } catch (e: any) {
      AppAlert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditShell title="In an Emergency" onSave={save} saving={saving} loading={loading} scrollRef={scrollRef}>
      {/* Voice carve-out reminder — plain register for this section */}
      <View style={{ marginBottom: 16 }}>
        <InlineNote>Recipients see this block only after entering your PIN. No personality here — plain labels, clear numbers.</InlineNote>
      </View>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow bold>Vet</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput
              name
              label="Your vet's name"
              placeholder="e.g. Dr. Sarah Mitchell"
              value={vetContactName}
              onChangeText={setVetContactName}
            />
            <LabeledPlacesInput
              label="Clinic name"
              placeholder="Search clinic name"
              value={vetClinic}
              onChangeText={(v) => { setVetClinic(v); setVetManual(false); }}
              onSelectPlace={(p) => { setVetClinic(p.name); setVetPhone(p.phone); setVetAddress(p.address); setVetManual(false); }}
              manual={vetManual}
              onToggleManual={() => setVetManual((v) => !v)}
              onClear={() => { setVetAddress(""); setVetPhone(""); setVetManual(false); }}
            />
            <LabeledInput
              label="Address"
              placeholder={vetManual ? "Type to add the address" : "Fills in from your clinic search"}
              editable={vetManual}
              pulseOn={vetManual}
              value={vetAddress}
              onChangeText={setVetAddress}
            />
            <LabeledInput
              label="Phone"
              placeholder={vetManual ? "Type to add the phone number" : "Fills in from your clinic search"}
              editable={vetManual}
              pulseOn={vetManual}
              phone
              keyboardType="phone-pad"
              value={vetPhone}
              onChangeText={setVetPhone}
            />
          </View>
        </Card>

        <Card>
          <Eyebrow bold>Emergency vet</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledPlacesInput
              label="Clinic name"
              placeholder="Search clinic name"
              value={emergClinic}
              onChangeText={(v) => { setEmergClinic(v); setEmergManual(false); }}
              onSelectPlace={(p) => { setEmergClinic(p.name); setEmergPhone(p.phone); setEmergAddress(p.address); setEmergManual(false); }}
              manual={emergManual}
              onToggleManual={() => setEmergManual((v) => !v)}
              onClear={() => { setEmergAddress(""); setEmergPhone(""); setEmergManual(false); }}
            />
            <LabeledInput
              label="Address"
              placeholder={emergManual ? "Type to add the address" : "Fills in from your clinic search"}
              editable={emergManual}
              pulseOn={emergManual}
              value={emergAddress}
              onChangeText={setEmergAddress}
            />
            <LabeledInput
              label="Phone"
              placeholder={emergManual ? "Type to add the phone number" : "Fills in from your clinic search"}
              editable={emergManual}
              pulseOn={emergManual}
              phone
              keyboardType="phone-pad"
              value={emergPhone}
              onChangeText={setEmergPhone}
            />
          </View>
        </Card>

        <Card>
          <Eyebrow bold>Insurance</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <InsurerInput label="Provider" placeholder="Provider" value={insuranceProvider} onChangeText={setInsuranceProvider} />
            <LabeledInput label="Policy number" placeholder="Policy number" value={insurancePolicy} onChangeText={setInsurancePolicy} />
          </View>
        </Card>

        <Card onLayout={(e) => { backupY.current = e.nativeEvent.layout.y; }}>
          <Eyebrow bold>Backup contact</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput name label="Name" placeholder="Name" value={backupName} onChangeText={setBackupName} />
            <LabeledInput label="Relationship" placeholder="e.g. sister" value={backupRel} onChangeText={setBackupRel} />
            <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={backupPhone} onChangeText={setBackupPhone} />
          </View>
          <CheckboxRow
            label="I have permission to share this person's contact info."
            checked={backupConsent}
            onToggle={setBackupConsent}
          />
          <CheckboxRow
            label="Can make care decisions if I'm unreachable."
            checked={backupIsDecisionContact}
            onToggle={setBackupIsDecisionContact}
          />
        </Card>

        {/* Second backup */}
        {!showSecondBackup ? (
          <TouchableOpacity
            onPress={() => setShowSecondBackup(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.dashedBorder, borderStyle: "dashed" }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 18, lineHeight: 18 }}>+</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Add another backup contact</Text>
          </TouchableOpacity>
        ) : (
          <Card>
            <Eyebrow bold>Second backup contact</Eyebrow>
            <View style={{ gap: 8, marginTop: 12 }}>
              <LabeledInput name label="Name" placeholder="Name" value={backup2Name} onChangeText={setBackup2Name} />
              <LabeledInput label="Relationship" placeholder="e.g. neighbour" value={backup2Rel} onChangeText={setBackup2Rel} />
              <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={backup2Phone} onChangeText={setBackup2Phone} />
            </View>
            <CheckboxRow
              label="I have permission to share this person's contact info."
              checked={backup2Consent}
              onToggle={setBackup2Consent}
            />
            <CheckboxRow
              label="Can make care decisions if I'm unreachable."
              checked={backup2IsDecisionContact}
              onToggle={setBackup2IsDecisionContact}
            />
          </Card>
        )}

        {/* No static reminder here — it now surfaces from the dashboard's
            stay-duration flow (setting/changing a stay length is the actual
            "new trip" signal), throttled to a 30-day cadence. See
            dashboard.tsx's maybeNudgeDecisionContact. */}

        {/* PIN editor */}
        <View onLayout={(e) => { pinY.current = e.nativeEvent.layout.y; }}>
          <PINEditor petId={petId} petName={pet?.name} autoStart={section === "pin"} />
        </View>
      </View>
    </EditShell>
  );
}

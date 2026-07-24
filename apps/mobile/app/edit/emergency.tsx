// Edit emergency contacts + PIN
import { useState, useEffect, useRef } from "react";
import { View, Text, Alert, TouchableOpacity, ScrollView } from "react-native";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { LabeledInput, Eyebrow, Card, InlineNote } from "../../components/ui";
import { LabeledPlacesInput } from "../../components/PlacesInput";
import CheckboxRow from "../../components/CheckboxRow";
import PINEditor from "../../components/PINEditor";
import { colors } from "@quirksandall/shared";
import { router, useLocalSearchParams } from "expo-router";

export default function EditEmergency() {
  const { petId, loading } = useActivePet();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const pinY = useRef(0);

  // Deep-link from the dashboard "Change PIN" quick action → scroll to (and
  // open) the PIN editor.
  useEffect(() => {
    if (loading || section !== "pin") return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: pinY.current, animated: true }), 400);
    return () => clearTimeout(t);
  }, [loading, section]);

  const [vetContactName, setVetContactName] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const [vetAddress, setVetAddress] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [emergClinic, setEmergClinic] = useState("");
  const [emergPhone, setEmergPhone] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceClaims, setInsuranceClaims] = useState("");
  const [backupName, setBackupName] = useState("");
  const [backupRel, setBackupRel] = useState("");
  const [backupPhone, setBackupPhone] = useState("");
  const [backupConsent, setBackupConsent] = useState(false);
  const [backup2Name, setBackup2Name] = useState("");
  const [backup2Rel, setBackup2Rel] = useState("");
  const [backup2Phone, setBackup2Phone] = useState("");
  const [backup2Consent, setBackup2Consent] = useState(false);
  const [showSecondBackup, setShowSecondBackup] = useState(false);
  const [vetPreAuth, setVetPreAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPIN, setShowPIN] = useState(false);

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
        setEmergPhone(vet.emergency_vet?.phone ?? "");
        setInsuranceProvider(vet.insurance?.provider ?? "");
        setInsurancePolicy(vet.insurance?.policy_number ?? "");
        setInsuranceClaims(vet.insurance?.claims_contact ?? "");
        setVetPreAuth(vet.vet_pre_auth ?? false);
      }
      if (owner) {
        const backup = owner.backup_contacts?.[0];
        if (backup) {
          setBackupName(backup.name ?? "");
          setBackupRel(backup.relationship ?? "");
          setBackupPhone(backup.phone ?? "");
          setBackupConsent(backup.consent_to_share ?? false);
        }
        const backup2 = owner.backup_contacts?.[1];
        if (backup2) {
          setBackup2Name(backup2.name ?? "");
          setBackup2Rel(backup2.relationship ?? "");
          setBackup2Phone(backup2.phone ?? "");
          setBackup2Consent(backup2.consent_to_share ?? false);
          setShowSecondBackup(true);
        }
      }
    })();
  }, [petId]);

  const save = async () => {
    if (!petId) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      await Promise.all([
        supabase.from("pet_vet_info").upsert({
          pet_id: petId,
          primary_vet: { contact_name: vetContactName, clinic: vetClinic, address: vetAddress, phone: vetPhone },
          emergency_vet: { clinic: emergClinic, phone: emergPhone },
          insurance: { provider: insuranceProvider, policy_number: insurancePolicy, claims_contact: insuranceClaims },
          vet_pre_auth: vetPreAuth,
        }, { onConflict: "pet_id" }),
        supabase.from("owners").update({
          backup_contacts: [
            { name: backupName, relationship: backupRel, phone: backupPhone, consent_to_share: backupConsent },
            ...(backup2Name || backup2Phone ? [{ name: backup2Name, relationship: backup2Rel, phone: backup2Phone, consent_to_share: backup2Consent }] : []),
          ],
        }).eq("id", user!.id),
      ]);
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
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
            <LabeledInput name label="Vet name" placeholder="e.g. Dr. Sarah Mitchell" value={vetContactName} onChangeText={setVetContactName} />
            <LabeledPlacesInput
              label="Clinic"
              placeholder="Search clinic name"
              value={vetClinic}
              onChangeText={setVetClinic}
              onSelectPlace={(p) => { setVetClinic(p.name); if (p.phone) setVetPhone(p.phone); if (p.address) setVetAddress(p.address); }}
            />
            <LabeledInput label="Address" placeholder="Address" value={vetAddress} onChangeText={setVetAddress} />
            <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={vetPhone} onChangeText={setVetPhone} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 8, fontFamily: "Satoshi-Light" }}>
            Consider pre-authorising your sitter directly with your vet by phone or through their online portal.
          </Text>
        </Card>

        <Card>
          <Eyebrow bold>Emergency vet</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledPlacesInput
              label="Clinic"
              placeholder="Search clinic name"
              value={emergClinic}
              onChangeText={setEmergClinic}
              onSelectPlace={(p) => { setEmergClinic(p.name); if (p.phone) setEmergPhone(p.phone); }}
            />
            <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={emergPhone} onChangeText={setEmergPhone} />
          </View>
        </Card>

        <Card>
          <Eyebrow bold>Insurance</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput label="Provider" placeholder="Provider" value={insuranceProvider} onChangeText={setInsuranceProvider} />
            <LabeledInput label="Policy number" placeholder="Policy number" value={insurancePolicy} onChangeText={setInsurancePolicy} />
            <LabeledInput label="Claims contact" placeholder="Claims contact / phone" value={insuranceClaims} onChangeText={setInsuranceClaims} />
          </View>
        </Card>

        <Card>
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
          </Card>
        )}

        {/* Pre-authorise vet */}
        <TouchableOpacity
          onPress={() => setVetPreAuth(!vetPreAuth)}
          style={{
            flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
            backgroundColor: vetPreAuth ? colors.secondary : "#FFFFFF",
            borderColor: vetPreAuth ? "rgba(81,0,0,0.2)" : colors.border,
          }}
        >
          <View style={{
            width: 18, height: 18, borderRadius: 4, borderWidth: 2, marginTop: 1, alignItems: "center", justifyContent: "center",
            backgroundColor: vetPreAuth ? colors.cardDark : "transparent",
            borderColor: vetPreAuth ? colors.cardDark : colors.dashedBorder,
          }}>
            {vetPreAuth && <Text style={{ color: "#F8ECEE", fontSize: 11 }}>✓</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>I've pre-authorised my vet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17, fontFamily: "Satoshi-Light" }}>
              Many clinics let you do this over the phone or via their portal — worth a quick call before you travel.
            </Text>
          </View>
        </TouchableOpacity>

        {/* PIN editor */}
        <View onLayout={(e) => { pinY.current = e.nativeEvent.layout.y; }}>
          <PINEditor petId={petId} autoStart={section === "pin"} />
        </View>
      </View>
    </EditShell>
  );
}

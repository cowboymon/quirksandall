// Edit emergency contacts + PIN
import { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card } from "../../components/ui";
import CheckboxRow from "../../components/CheckboxRow";
import PINEditor from "../../components/PINEditor";
import { colors } from "@quirksandall/shared";
import { router } from "expo-router";

export default function EditEmergency() {
  const { petId, loading } = useActivePet();

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
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPIN, setShowPIN] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const [{ data: vet }, { data: owner }] = await Promise.all([
        supabase.from("pet_vet_info").select("*").eq("pet_id", petId).single(),
        supabase.from("owners").select("name, primary_phone, backup_contacts").eq("id", (await supabase.auth.getUser()).data.user!.id).single(),
      ]);
      if (vet) {
        setVetClinic(vet.primary_vet?.clinic ?? "");
        setVetAddress(vet.primary_vet?.address ?? "");
        setVetPhone(vet.primary_vet?.phone ?? "");
        setEmergClinic(vet.emergency_vet?.clinic ?? "");
        setEmergPhone(vet.emergency_vet?.phone ?? "");
        setInsuranceProvider(vet.insurance?.provider ?? "");
        setInsurancePolicy(vet.insurance?.policy_number ?? "");
        setInsuranceClaims(vet.insurance?.claims_contact ?? "");
      }
      if (owner) {
        setOwnerName(owner.name ?? "");
        setOwnerPhone(owner.primary_phone ?? "");
        const backup = owner.backup_contacts?.[0];
        if (backup) {
          setBackupName(backup.name ?? "");
          setBackupRel(backup.relationship ?? "");
          setBackupPhone(backup.phone ?? "");
          setBackupConsent(backup.consent_to_share ?? false);
        }
      }
    })();
  }, [petId]);

  const save = async () => {
    if (!petId) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await Promise.all([
        supabase.from("pet_vet_info").upsert({
          pet_id: petId,
          primary_vet: { clinic: vetClinic, address: vetAddress, phone: vetPhone },
          emergency_vet: { clinic: emergClinic, phone: emergPhone },
          insurance: { provider: insuranceProvider, policy_number: insurancePolicy, claims_contact: insuranceClaims },
        }),
        supabase.from("owners").update({
          name: ownerName,
          primary_phone: ownerPhone,
          backup_contacts: [{
            name: backupName,
            relationship: backupRel,
            phone: backupPhone,
            consent_to_share: backupConsent,
          }],
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
    <EditShell title="Emergency contacts" onSave={save} saving={saving} loading={loading}>
      {/* Voice carve-out reminder — plain register for this section */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 10,
          borderLeftWidth: 3,
          borderLeftColor: colors.caution,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
          Recipients see this block only after entering your PIN. No personality here — plain labels, clear numbers.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow>Your contact</Eyebrow>
          <Input className="mt-2" placeholder="Your name" value={ownerName} onChangeText={setOwnerName} />
          <Input className="mt-2" placeholder="Your phone" keyboardType="phone-pad" value={ownerPhone} onChangeText={setOwnerPhone} />
        </Card>

        <Card>
          <Eyebrow>Vet</Eyebrow>
          <Input className="mt-2" placeholder="Clinic name" value={vetClinic} onChangeText={setVetClinic} />
          <Input className="mt-2" placeholder="Address" value={vetAddress} onChangeText={setVetAddress} />
          <Input className="mt-2" placeholder="Phone" keyboardType="phone-pad" value={vetPhone} onChangeText={setVetPhone} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
            Consider pre-authorising your sitter directly with your vet by phone or through their online portal.
          </Text>
        </Card>

        <Card>
          <Eyebrow>Emergency / after-hours vet</Eyebrow>
          <Input className="mt-2" placeholder="Clinic name" value={emergClinic} onChangeText={setEmergClinic} />
          <Input className="mt-2" placeholder="Phone" keyboardType="phone-pad" value={emergPhone} onChangeText={setEmergPhone} />
        </Card>

        <Card>
          <Eyebrow>Insurance</Eyebrow>
          <Input className="mt-2" placeholder="Provider" value={insuranceProvider} onChangeText={setInsuranceProvider} />
          <Input className="mt-2" placeholder="Policy number" value={insurancePolicy} onChangeText={setInsurancePolicy} />
          <Input className="mt-2" placeholder="Claims contact / phone" value={insuranceClaims} onChangeText={setInsuranceClaims} />
        </Card>

        <Card>
          <Eyebrow>Backup contact</Eyebrow>
          <Input className="mt-2" placeholder="Name" value={backupName} onChangeText={setBackupName} />
          <Input className="mt-2" placeholder="Relationship (e.g. sister)" value={backupRel} onChangeText={setBackupRel} />
          <Input className="mt-2" placeholder="Phone" keyboardType="phone-pad" value={backupPhone} onChangeText={setBackupPhone} />
          <CheckboxRow
            label="I have permission to share this person's contact info."
            checked={backupConsent}
            onToggle={setBackupConsent}
          />
        </Card>

        {/* PIN editor */}
        <PINEditor petId={petId} />
      </View>
    </EditShell>
  );
}

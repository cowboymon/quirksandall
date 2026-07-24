// Inline PIN change component — used in the emergency contacts edit screen
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { colors } from "@quirksandall/shared";
import { Eyebrow, Card } from "./ui";

type Props = { petId: string | null; autoStart?: boolean };

type Stage = "idle" | "set" | "confirm";

export default function PINEditor({ petId, autoStart }: Props) {
  const [stage, setStage] = useState<Stage>(autoStart ? "set" : "idle");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = stage === "confirm" ? confirm : pin;

  const handleChange = async (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);

    if (stage === "set") {
      setPin(digits);
      if (digits.length === 4) setTimeout(() => setStage("confirm"), 300);
      return;
    }

    if (stage === "confirm") {
      setConfirm(digits);
      if (digits.length !== 4) return;

      if (digits !== pin) {
        setMismatch(true);
        setTimeout(() => { setConfirm(""); setMismatch(false); }, 900);
        return;
      }

      // Save — call set-pin edge function so hashing happens server-side
      setSaving(true);
      try {
        const { data: link } = await supabase
          .from("share_links")
          .select("id")
          .eq("pet_id", petId!)
          .eq("revoked", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!link) throw new Error("No active share link found");

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-pin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ link_id: link.id, pin: digits }),
        });

        if (!res.ok) throw new Error("PIN update failed");
        setStage("idle");
        setPin("");
        setConfirm("");
        Alert.alert("PIN updated", "New PIN is active.");
      } catch (e: any) {
        Alert.alert("Couldn't update PIN", e.message);
        setStage("set");
        setPin("");
        setConfirm("");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <Card style={{ borderColor: "rgba(184,58,82,0.35)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="key-outline" size={16} color={colors.primary} />
        <Eyebrow bold>For if you're ever not there</Eyebrow>
      </View>

      {stage === "idle" && (
        <>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, marginBottom: 12, fontFamily: "Satoshi-Light" }}>
            Anyone with the link sees the profile. This part waits for the PIN.
          </Text>
          <TouchableOpacity
            onPress={() => setStage("set")}
            style={{ height: 44, borderRadius: 10, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="lock-closed" size={15} color="#F8ECEE" />
            <Text style={{ color: "#F8ECEE", fontSize: 14, fontFamily: "Satoshi-Bold" }}>Change PIN</Text>
          </TouchableOpacity>
        </>
      )}

      {stage !== "idle" && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: mismatch ? colors.danger : colors.textMuted, fontSize: 13, marginBottom: 8 }}>
            {stage === "set" ? "Choose a 4-digit PIN" : mismatch ? "Didn't match. Try again." : "Confirm your PIN"}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, position: "relative" }}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  flex: 1, height: 52, borderRadius: 10, borderWidth: 2,
                  alignItems: "center", justifyContent: "center",
                  borderColor: mismatch
                    ? colors.danger
                    : i < current.length ? colors.button
                    : i === current.length ? colors.primary
                    : colors.border,
                  backgroundColor: mismatch ? "rgba(184,112,112,0.1)" : i < current.length ? colors.button : colors.cardBg,
                }}
              >
                {i < current.length && (
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#F8ECEE" }} />
                )}
              </View>
            ))}
            <TextInput
              style={{ position: "absolute", opacity: 0, width: "100%", height: "100%" }}
              value={current}
              onChangeText={handleChange}
              keyboardType="numeric"
              maxLength={4}
              autoFocus
            />
          </View>

          {saving && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          <TouchableOpacity onPress={() => { setStage("idle"); setPin(""); setConfirm(""); }} style={{ marginTop: 10 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

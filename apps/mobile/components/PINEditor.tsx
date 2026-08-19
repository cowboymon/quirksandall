// Inline PIN change component — used in the emergency contacts edit screen
import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Key, LockSimple } from "./icons";
import { AppAlert } from "../stores/appAlert";
import { supabase } from "../lib/supabase";
import { rememberPin } from "../lib/pinVault";
import { colors } from "@quirksandall/shared";
import { Eyebrow, Card } from "./ui";

type Props = { petId: string | null; petName?: string | null; autoStart?: boolean; onSaved?: () => void };

type Stage = "idle" | "set" | "confirm";

export default function PINEditor({ petId, petName, autoStart, onSaved }: Props) {
  const [stage, setStage] = useState<Stage>(autoStart ? "set" : "idle");
  // Setting a first PIN and replacing an existing one are different actions
  // and need different words — "change" and "the old PIN stopped working"
  // are both wrong when there was never a PIN to begin with.
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = stage === "confirm" ? confirm : pin;

  useEffect(() => {
    if (!petId) return;
    supabase
      .from("share_links")
      .select("pin_hash")
      .eq("pet_id", petId)
      .eq("revoked", false)
      .not("pin_hash", "is", null)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasPin(!!data));
  }, [petId]);

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
        // EVERY active link, not just the newest. The PIN is a per-pet secret
        // as far as the owner is concerned — updating one link left the others
        // on the old PIN, so an owner who changed it to cut off access hadn't
        // actually cut anything off.
        const { data: links } = await supabase
          .from("share_links")
          .select("id")
          .eq("pet_id", petId!)
          .eq("revoked", false);

        if (!links?.length) throw new Error("No active share link found");

        const { data: { session } } = await supabase.auth.getSession();
        const results = await Promise.all(
          links.map((l) =>
            fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-pin`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ link_id: l.id, pin: digits }),
            })
          )
        );
        // Partial success is worse than none: some links on the new PIN and
        // some on the old is exactly the confusion this fix exists to remove.
        if (results.some((r) => !r.ok)) throw new Error("PIN update failed");
        // Keep a device-local copy so the share flow can offer to send it.
        if (petId) await rememberPin(petId, digits);
        setStage("idle");
        setPin("");
        setConfirm("");
        // Read before flipping the flag: replacing a PIN silently locks out
        // anyone holding the old one (the sitter just sees "that PIN didn't
        // match"), so the owner is told. Setting a first PIN locks out nobody
        // and shouldn't imply it did.
        const wasReplaced = hasPin === true;
        const who = petName?.trim() || "your pet";
        setHasPin(true);
        AppAlert.alert(
          wasReplaced ? "PIN updated" : "PIN set",
          wasReplaced
            ? "The old PIN stopped working straight away. Anyone still looking after " +
              who + " will need the new one — send it to them when you get a chance."
            : "The emergency contacts on " + who + "'s link now wait for this PIN. " +
              "You'll find it on the dashboard whenever you need to send it.",
          onSaved ? [{ text: "OK", onPress: onSaved }] : undefined
        );
      } catch (e: any) {
        AppAlert.alert("Couldn't update PIN", e.message);
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
        <Key size={16} color={colors.primary} />
        <Eyebrow bold>For if you're ever not there</Eyebrow>
      </View>

      {stage === "idle" && (
        <>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, marginBottom: 12, fontFamily: "Satoshi-Light" }}>
            {hasPin
              ? "Anyone with the link sees the profile. This part waits for the PIN."
              : "Anyone with the link sees the profile. Set a PIN to keep the emergency contacts back."}
          </Text>
          <TouchableOpacity
            onPress={() => setStage("set")}
            activeOpacity={0.85}
            style={{ height: 46, borderRadius: 12, backgroundColor: colors.button, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <LockSimple size={15} color={colors.buttonText} weight="fill" />
            <Text style={{ color: colors.buttonText, fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>{hasPin ? "Change PIN" : "Set a PIN"}</Text>
          </TouchableOpacity>
        </>
      )}

      {stage !== "idle" && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: mismatch ? colors.danger : colors.textMuted, fontSize: 13, marginBottom: 8 }}>
            {stage === "set" ? (hasPin ? "Choose a new 4-digit PIN" : "Choose a 4-digit PIN") : mismatch ? "Didn't match. Try again." : "Confirm your PIN"}
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

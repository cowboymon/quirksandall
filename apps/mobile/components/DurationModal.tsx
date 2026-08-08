// Stay-duration picker (§5.1) — set how long a pet is staying, per link.
// Presets are the primary choice; an exact end date is the tap-through option.
// Choosing one clears the other.
//
// Deliberately NOT an RN <Modal>: the exact-date field opens DatePickerSheet,
// which on iOS is itself a Modal, and presenting a modal from inside another
// modal is the same iOS presentation race that broke the share sheet (#6) —
// intermittent crashes when the second presentation lands while the first
// still owns the transition. As a plain absolute-fill overlay (mounted as a
// sibling of the dashboard's ScrollView, so it pins to the viewport), the
// date sheet is the only real modal on screen.
import { useEffect, useState } from "react";
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, View, Text, TouchableOpacity } from "react-native";
import { colors, displayDateToISO, isoToDisplayDate } from "@quirksandall/shared";
import { DateInput } from "./ui";

const PRESETS = [
  { key: "hours", label: "A few hours" },
  { key: "overnight", label: "Overnight" },
  { key: "days", label: "A few days" },
  { key: "longer", label: "Longer" },
] as const;

type Props = {
  visible: boolean;
  petName: string;
  initialPreset: string | null;
  initialEndsAt: string | null;
  onSave: (preset: string | null, endsAt: string | null) => void;
  onClose: () => void;
};

export default function DurationModal({ visible, petName, initialPreset, initialEndsAt, onSave, onClose }: Props) {
  const [preset, setPreset] = useState<string | null>(initialPreset);
  const [date, setDate] = useState<string>(isoToDisplayDate(initialEndsAt));

  const pickPreset = (key: string) => { setPreset(key); setDate(""); };
  const onDate = (v: string) => { setDate(v); if (v) setPreset(null); };

  const save = () => {
    const iso = date ? displayDateToISO(date) : null;
    if (iso) onSave(null, iso);
    else onSave(preset, null);
  };

  // What <Modal onRequestClose> used to give us on Android.
  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100 }}
      >
      {/* Not an RN Modal (see file header), so nothing auto-shifts for the
          keyboard or lets the card be dismissed by tapping outside it — both
          handled explicitly here. Without Keyboard.dismiss() on backdrop tap,
          the exact-date field's numeric keyboard could cover Save/Cancel with
          no way to reach them or back out, appearing frozen. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 22 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 22, lineHeight: 26, color: colors.textDark }}>
            How long is {petName || "your pet"} staying?
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6, fontFamily: "Satoshi-Light" }}>
            Shown to whoever opens this link, so they know the plan. Optional.
          </Text>

          {/* Presets */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            {PRESETS.map((p) => {
              const active = preset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => pickPreset(p.key)}
                  activeOpacity={0.85}
                  style={{
                    paddingHorizontal: 14, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center",
                    backgroundColor: active ? colors.cardDark : colors.secondary,
                    borderWidth: 1, borderColor: active ? colors.cardDark : colors.border,
                  }}
                >
                  <Text style={{ color: active ? colors.cardDarkText : colors.textDark, fontSize: 13, fontFamily: "Satoshi-Medium" }}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Exact date (tap-through) */}
          <Text style={{ color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium", marginTop: 20, marginBottom: 6 }}>
            Or an exact end date
          </Text>
          <DateInput value={date} onChangeText={onDate} range="future" placeholder="dd/mm/yyyy" />

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            <TouchableOpacity
              onPress={() => { onSave(null, null); }}
              activeOpacity={0.85}
              style={{ height: 46, paddingHorizontal: 16, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{ flex: 1, height: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              activeOpacity={0.85}
              style={{ flex: 1, height: 46, borderRadius: 11, backgroundColor: colors.cardDark, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 14, fontFamily: "Satoshi-Bold" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
  );
}

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
import { BackHandler, Dimensions, Keyboard, Platform, TouchableWithoutFeedback, View, Text, TouchableOpacity } from "react-native";
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

  // Keyboard height, tracked by hand. KeyboardAvoidingView measures itself
  // relative to the window on layout, and inside an absolute-fill overlay it
  // reliably mismeasured here (verified on device: the card never moved and
  // the exact-date field's keyboard sat over Save/Cancel). Listening to the
  // keyboard frame directly and padding the overlay is unambiguous.
  // willChangeFrame on iOS also covers height changes (emoji/QuickType);
  // Android's adjustResize handles it at the window level, hence 0 there.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const onFrame = (e: { endCoordinates: { screenY: number } }) =>
      setKeyboardHeight(Math.max(0, Dimensions.get("window").height - e.endCoordinates.screenY));
    const subs = [
      Keyboard.addListener("keyboardWillChangeFrame", onFrame),
      Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  if (!visible) return null;

  return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100 }}>
      {/* Not an RN Modal (see file header), so nothing auto-shifts for the
          keyboard or lets the card be dismissed by tapping outside it — both
          handled explicitly here: the backdrop is its own dismiss-on-tap
          layer behind the card (never wrapping the TextInput), and the
          overlay pads itself by the tracked keyboard height so the card and
          its Save/Cancel row stay above the keyboard. The number-pad's
          guaranteed close button lives on the keyboard itself — see
          NumericDoneAccessory in ui.tsx (iOS number pads have no return
          key, so without it this overlay had no reliable way out). */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(31,26,23,0.45)" }} />
      </TouchableWithoutFeedback>
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: keyboardHeight }}>
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
      </View>
  );
}

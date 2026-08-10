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
import { BackHandler, Platform, View, Text, TouchableOpacity } from "react-native";
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
  initialStartsAt: string | null;
  initialEndsAt: string | null;
  onSave: (preset: string | null, endsAt: string | null, startsAt: string | null) => void;
  onClose: () => void;
};

export default function DurationModal({ visible, petName, initialPreset, initialStartsAt, initialEndsAt, onSave, onClose }: Props) {
  const [preset, setPreset] = useState<string | null>(initialPreset);
  const [startDate, setStartDate] = useState<string>(isoToDisplayDate(initialStartsAt));
  const [date, setDate] = useState<string>(isoToDisplayDate(initialEndsAt));

  const pickPreset = (key: string) => { setPreset(key); setDate(""); };
  const onDate = (v: string) => { setDate(v); if (v) setPreset(null); };

  const save = () => {
    // Start date (#20) is independent of the preset/end-date choice — "for a
    // few days from Sat 12 Aug" is a valid combination. Left empty it means
    // "already with you", so no implicit today is stored.
    const startIso = startDate ? displayDateToISO(startDate) : null;
    const iso = date ? displayDateToISO(date) : null;
    if (iso) onSave(null, iso, startIso);
    else onSave(preset, null, startIso);
  };

  // What <Modal onRequestClose> used to give us on Android.
  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100, backgroundColor: "rgba(31,26,23,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
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

          {/* Dates (tap-through, no keyboard) */}
          <Text style={{ color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium", marginTop: 20, marginBottom: 6 }}>
            From (leave blank if the stay's already begun)
          </Text>
          <DateInput value={startDate} onChangeText={setStartDate} range="future" placeholder="dd/mm/yyyy" pickerOnly />

          <Text style={{ color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium", marginTop: 14, marginBottom: 6 }}>
            Until (an exact date — replaces the preset above)
          </Text>
          {/* pickerOnly: inside this overlay a text keyboard is a trap — the
              iOS number pad has no return key and the card swallows most
              taps, so typed entry here shipped as a stuck-keyboard bug (#25).
              Tap-through to the picker sheet is the whole interaction. */}
          <DateInput value={date} onChangeText={onDate} range="future" placeholder="dd/mm/yyyy" pickerOnly />

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            {/* Wipes preset AND both dates in one go — the individual fields
                each have their own × now, so this is the deliberate
                "start again" action rather than the only way out. */}
            <TouchableOpacity
              onPress={() => { onSave(null, null, null); }}
              activeOpacity={0.85}
              style={{ height: 46, paddingHorizontal: 16, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Clear all</Text>
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
  );
}

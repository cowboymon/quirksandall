// Google Places autocomplete for vet / clinic fields. When the key
// EXPO_PUBLIC_GOOGLE_PLACES_KEY is present it suggests real establishments and,
// on selection, returns the place name + phone to auto-fill the card. With no
// key it degrades gracefully to a plain typed field (no behaviour change).
import { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { colors } from "@quirksandall/shared";
import { FieldLabel } from "./ui";

const KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
export const PLACES_ENABLED = !!KEY;

type Prediction = { description: string; place_id: string };

export function LabeledPlacesInput({
  label,
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onSelectPlace: (p: { name: string; phone: string; address: string }) => void;
  placeholder?: string;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [focused, setFocused] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (text: string) => {
    onChangeText(text);
    if (!KEY || text.trim().length < 3) { setPredictions([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=establishment&key=${KEY}`
        );
        const data = await res.json();
        setPredictions((data.predictions ?? []).slice(0, 5).map((p: any) => ({ description: p.description, place_id: p.place_id })));
      } catch {
        setPredictions([]);
      }
    }, 350);
  };

  const pick = async (p: Prediction) => {
    setPredictions([]);
    onChangeText(p.description);
    if (!KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_phone_number,formatted_address&key=${KEY}`
      );
      const data = await res.json();
      const r = data.result ?? {};
      onSelectPlace({ name: r.name ?? p.description, phone: r.formatted_phone_number ?? "", address: r.formatted_address ?? "" });
    } catch {
      /* leave the typed text as-is */
    }
  };

  return (
    <View style={{ position: "relative", zIndex: focused && predictions.length ? 20 : 0 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        placeholderTextColor={colors.dashedBorder}
        autoCapitalize="words"
        style={{
          minHeight: 40, borderRadius: 8, borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.background,
          paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Satoshi", color: colors.textDark,
        }}
      />
      {focused && predictions.length > 0 && (
        <View
          style={{
            position: "absolute", top: 62, left: 0, right: 0, backgroundColor: "#FFFFFF",
            borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden", elevation: 6,
            shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
          }}
        >
          {predictions.map((p, i) => (
            <TouchableOpacity
              key={p.place_id}
              onPress={() => pick(p)}
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
            >
              <Text style={{ color: colors.textDark, fontSize: 13, fontFamily: "Satoshi" }} numberOfLines={1}>{p.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

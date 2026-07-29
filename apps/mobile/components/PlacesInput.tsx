// Google Places autocomplete for vet / clinic fields. When the key
// EXPO_PUBLIC_GOOGLE_PLACES_KEY is present it suggests real establishments and,
// on selection, returns the place name + phone to auto-fill the card. With no
// key it degrades gracefully to a plain typed field (no behaviour change).
//
// Search fires on submit (return key / search icon tap), not live as you
// type — an explicit action rather than type-ahead, with a search icon to
// make that obvious.
//
// Suggestions render in a full-screen Modal rather than an inline absolute
// View — dims the rest of the screen while searching (so the dropdown reads
// as the focused thing to interact with) and avoids the janky reflow of a
// dropdown pushing surrounding form content around as it opens/closes.
import { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, Animated, Keyboard, Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@quirksandall/shared";
import { FieldLabel } from "./ui";

const KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
export const PLACES_ENABLED = !!KEY;

type Prediction = { description: string; place_id: string };
type Anchor = { x: number; y: number; width: number };

export function LabeledPlacesInput({
  label,
  value,
  onChangeText,
  onSelectPlace,
  onManualEntry,
  onClear,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onSelectPlace: (p: { name: string; phone: string; address: string }) => void;
  // "Can't find your clinic?" — unlocks manual entry without pretending we
  // have verified address/phone data, unlike a real onSelectPlace pick.
  onManualEntry?: () => void;
  // The X button — clears more than just this field's own text; callers use
  // it to cascade-clear the address/phone that came from the same search.
  onClear?: () => void;
  placeholder?: string;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const fieldRef = useRef<View>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const measure = () => {
    fieldRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y: y + height + 4, width }));
  };

  // Clears the dropdown without touching the keyboard — used on blur, where
  // focus may just be moving to the next field, not actually being dismissed.
  const closeDropdown = () => {
    setPredictions([]);
    fade.setValue(0);
  };

  const close = () => {
    closeDropdown();
    setFocused(false);
    Keyboard.dismiss();
  };

  const search = async () => {
    if (!KEY || !value.trim()) { setPredictions([]); return; }
    setFocused(true);
    measure();
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(value)}&types=establishment&key=${KEY}`
      );
      const data = await res.json();
      setPredictions((data.predictions ?? []).slice(0, 5).map((p: any) => ({ description: p.description, place_id: p.place_id })));
    } catch {
      setPredictions([]);
    }
  };

  const pick = async (p: Prediction) => {
    close();
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

  const clear = () => {
    onChangeText("");
    closeDropdown();
    onClear?.();
  };

  // Escape hatch for a clinic Places doesn't have — unlocks manual entry
  // rather than pretending we have verified data for it.
  const enterManually = () => {
    close();
    onManualEntry?.();
  };

  const showDropdown = focused && predictions.length > 0 && !!anchor;

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View ref={fieldRef} collapsable={false} style={{ justifyContent: "center" }}>
        <TouchableOpacity
          onPress={search}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ position: "absolute", left: 10, zIndex: 1 }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          value={value}
          onChangeText={(t) => { onChangeText(t); closeDropdown(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => { closeDropdown(); setFocused(false); }, 150)}
          onSubmitEditing={search}
          returnKeyType="search"
          blurOnSubmit={false}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={{
            minHeight: 40, borderRadius: 8, borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.background,
            paddingLeft: 34, paddingRight: value ? 34 : 12, paddingVertical: 8,
            fontSize: 14, fontFamily: "Satoshi", color: colors.textDark,
          }}
        />
        {!!value && (
          <TouchableOpacity
            onPress={clear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: "absolute", right: 10, height: 20, width: 20, borderRadius: 10, backgroundColor: colors.textMuted, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontFamily: "Satoshi-Bold", lineHeight: 14 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={enterManually} style={{ marginTop: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi" }}>
          Can't find your clinic? Enter it manually
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="none"
        onShow={() => Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start()}
        onRequestClose={close}
      >
        <Pressable style={{ flex: 1, backgroundColor: "rgba(30,10,14,0.35)" }} onPress={close}>
          {anchor && (
            <Animated.View
              style={{
                opacity: fade,
                transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
                position: "absolute",
                top: anchor.y,
                left: anchor.x,
                width: Math.min(anchor.width, Dimensions.get("window").width - anchor.x - 16),
                backgroundColor: "#FFFFFF",
                borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden",
                shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              {predictions.map((p, i) => (
                <TouchableOpacity
                  key={p.place_id}
                  onPress={() => pick(p)}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                >
                  <Text style={{ color: colors.textDark, fontSize: 13, fontFamily: "Satoshi" }} numberOfLines={1}>{p.description}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

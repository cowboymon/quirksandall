// Insurance provider field: a free-text input with suggestions on demand.
//
// Deliberately not a dropdown-select. The published insurer list is a snapshot
// that goes stale, and an owner whose insurer isn't on it must never be stuck —
// so anything typed is valid and the suggestions are just a shortcut. Where we
// have no verified list for the user's region, this degrades to exactly the
// plain field it replaces.
//
// Structure and behaviour deliberately mirror LabeledPlacesInput (the vet
// clinic search) 1:1 — search fires on the search key / icon tap, never live
// while typing; results show in the same dimming modal; typing closes the
// list. The two search fields sit on the same screens and must feel
// identical, and this exact pattern is the one proven not to fight the
// keyboard's show/hide animations. Only the data source differs: a local
// list filter instead of the Places API.
import { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, Animated, Keyboard, Dimensions, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Localization from "expo-localization";
import { colors } from "@quirksandall/shared";
import { FieldLabel } from "./ui";
import { insurersForRegion, filterInsurers } from "../lib/insurers";

type Anchor = { x: number; y: number; width: number };

export function InsurerInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<string[]>([]);
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
    setResults([]);
    fade.setValue(0);
  };

  const close = () => {
    closeDropdown();
    setFocused(false);
    Keyboard.dismiss();
  };

  const search = () => {
    if (!value.trim()) { setResults([]); return; }
    setFocused(true);
    measure();
    // Device region, not store region — reflects where the user actually is
    // and needs no permission.
    const region = Localization.getLocales?.()[0]?.regionCode ?? null;
    const list = insurersForRegion(region);
    const q = value.trim().toLowerCase();
    // All matches, names starting with the query first — "b" lists every
    // B-insurer before names that merely contain a b.
    const matches = [...filterInsurers(list, value)].sort(
      (a, b) => Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q))
    );
    setResults(matches);
  };

  const pick = (name: string) => {
    close();
    onChangeText(name);
  };

  const clear = () => {
    onChangeText("");
    closeDropdown();
  };

  const showDropdown = focused && results.length > 0 && !!anchor;

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
            fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi", color: colors.textDark,
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
              <ScrollView style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled" bounces={false} overScrollMode="never">
                {results.map((name, i) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => pick(name)}
                    style={{ paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                  >
                    <Text style={{ color: colors.textDark, fontSize: 13, fontFamily: "Satoshi" }} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

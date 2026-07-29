// Insurance provider field: a free-text input with suggestions underneath.
//
// Deliberately not a dropdown. The published insurer list is a snapshot that
// goes stale, and an owner whose insurer isn't on it must never be stuck — so
// anything typed is valid and the suggestions are just a shortcut. Where we
// have no verified list for the user's region, this degrades to exactly the
// plain field it replaces.
//
// Presentation matches LabeledPlacesInput (dimming modal, measured anchor) so
// the two suggestion fields in this screen behave identically.
import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, Animated, Keyboard, Dimensions } from "react-native";
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
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [list, setList] = useState<string[]>([]);
  const fieldRef = useRef<View>(null);
  const fade = useRef(new Animated.Value(0)).current;

  // Device region, not store region — reflects where the user actually is and
  // needs no permission. Read once; it can't change mid-session.
  useEffect(() => {
    const region = Localization.getLocales?.()[0]?.regionCode ?? null;
    setList(insurersForRegion(region));
  }, []);

  const measure = () => {
    fieldRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y: y + height + 4, width }));
  };

  const closeDropdown = () => { setFocused(false); fade.setValue(0); };
  const close = () => { closeDropdown(); Keyboard.dismiss(); };

  const matches = filterInsurers(list, value).slice(0, 6);
  // Hide once the typed value is already an exact pick — no point offering a
  // suggestion identical to what's in the field.
  const exact = matches.length === 1 && matches[0].toLowerCase() === value.trim().toLowerCase();
  const showDropdown = focused && matches.length > 0 && !exact && !!anchor;

  const pick = (name: string) => { onChangeText(name); close(); };

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View ref={fieldRef} collapsable={false} style={{ justifyContent: "center" }}>
        <View style={{ position: "absolute", left: 10, zIndex: 1 }}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
        </View>
        <TextInput
          value={value}
          // Deliberately no measure() here: it's a native round-trip, and on
          // every keystroke it was what made this field feel slower than the
          // clinic search. The anchor can't move while typing, so measuring
          // on focus covers it.
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); measure(); }}
          onBlur={() => setTimeout(closeDropdown, 150)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          returnKeyType="search"
          // Nothing to submit — the list filters locally as you type — so
          // the return key takes the single remaining match if there is one,
          // and otherwise just gets out of the way.
          onSubmitEditing={() => { if (matches.length === 1) pick(matches[0]); else close(); }}
          style={{
            minHeight: 40, borderRadius: 8, borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.background,
            paddingLeft: 34, paddingRight: 12, paddingVertical: 8, fontSize: 14, fontFamily: "Satoshi", color: colors.textDark,
          }}
        />
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
              {matches.map((name, i) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => pick(name)}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                >
                  <Text style={{ color: colors.textDark, fontSize: 13, fontFamily: "Satoshi" }} numberOfLines={1}>{name}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

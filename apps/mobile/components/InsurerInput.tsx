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
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [list, setList] = useState<string[]>([]);
  // Debounced copy of the typed value — the dropdown filters on this, so it
  // waits for a pause in typing instead of popping open mid-word.
  const [debounced, setDebounced] = useState(value);
  const fieldRef = useRef<View>(null);
  const listRef = useRef<ScrollView>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 350);
    return () => clearTimeout(t);
  }, [value]);

  // The list re-sorts (prefix matches first) every time `debounced` changes —
  // without this, a reorder could land completely different rows underneath
  // wherever the user had scrolled to, reading as a flash/jump.
  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [debounced]);

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

  // All matches, names starting with the query first — "b" lists every
  // B-insurer before names that merely contain a b. The list scrolls past
  // eight rows rather than being cut off.
  const q = debounced.trim().toLowerCase();
  const matches = [...filterInsurers(list, debounced)].sort(
    (a, b) => Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q))
  );
  // Hide once the typed value is already an exact pick — no point offering a
  // suggestion identical to what's in the field.
  const exact = matches.length === 1 && matches[0].toLowerCase() === value.trim().toLowerCase();
  // Nothing until they type: an empty field matches the whole list, and the
  // whole list appearing on first tap reads as "pick from these" — the
  // opposite of what this field promises (type anything; suggestions are a
  // shortcut).
  const showDropdown = focused && q.length > 0 && value.trim().length > 0 && matches.length > 0 && !exact && !!anchor;

  const pick = (name: string) => { onChangeText(name); close(); };
  const clear = () => { onChangeText(""); setDebounced(""); closeDropdown(); };

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View ref={fieldRef} collapsable={false} style={{ justifyContent: "center" }}>
        <TouchableOpacity
          onPress={() => { setDebounced(value); setFocused(true); measure(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ position: "absolute", left: 10, zIndex: 1 }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
        </TouchableOpacity>
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
          // The search key takes the single remaining match if there is one;
          // otherwise it shows the list immediately (skipping the debounce)
          // and keeps the keyboard up so the user can keep refining.
          submitBehavior="submit"
          onSubmitEditing={() => {
            if (matches.length === 1) { pick(matches[0]); return; }
            setDebounced(value);
            setFocused(true);
            measure();
          }}
          style={{
            minHeight: 40, borderRadius: 8, borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.background,
            paddingLeft: 34, paddingRight: value ? 34 : 12, paddingVertical: 8, fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi", color: colors.textDark,
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
              <ScrollView ref={listRef} style={{ maxHeight: 316 }} keyboardShouldPersistTaps="handled" bounces={false} overScrollMode="never">
                {matches.map((name, i) => (
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

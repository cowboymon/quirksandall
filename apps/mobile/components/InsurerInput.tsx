// Insurance provider field: a free-text input with suggestions underneath.
//
// Deliberately not a dropdown-select. The published insurer list is a snapshot
// that goes stale, and an owner whose insurer isn't on it must never be stuck —
// so anything typed is valid and the suggestions are just a shortcut. Where we
// have no verified list for the user's region, this degrades to exactly the
// plain field it replaces.
//
// The suggestion list renders INLINE (absolutely positioned under the field),
// not in a Modal. The previous Modal presentation dimmed the screen, and its
// open/close transitions raced the keyboard's own show/hide animation — the
// backdrop visibly flashed when dismissing. An inline list has no separate
// window, no scrim, and nothing to race.
import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Localization from "expo-localization";
import { colors } from "@quirksandall/shared";
import { FieldLabel } from "./ui";
import { insurersForRegion, filterInsurers } from "../lib/insurers";

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
  const [list, setList] = useState<string[]>([]);
  // Debounced copy of the typed value — the dropdown filters on this, so it
  // waits for a pause in typing instead of popping open mid-word.
  const [debounced, setDebounced] = useState(value);
  const listRef = useRef<ScrollView>(null);
  // onBlur delays its close so a tap on a suggestion row lands before the
  // blur that same tap causes; picking/clearing cancels the pending close.
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 350);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    return () => { if (blurTimeout.current) clearTimeout(blurTimeout.current); };
  }, []);

  // The list re-sorts (prefix matches first) when `debounced` changes — snap
  // back to the top so a reorder never lands under a stale scroll offset.
  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [debounced]);

  // Device region, not store region — reflects where the user actually is and
  // needs no permission. Read once; it can't change mid-session.
  useEffect(() => {
    const region = Localization.getLocales?.()[0]?.regionCode ?? null;
    setList(insurersForRegion(region));
  }, []);

  const cancelPendingClose = () => {
    if (blurTimeout.current) { clearTimeout(blurTimeout.current); blurTimeout.current = null; }
  };

  // All matches, names starting with the query first — "b" lists every
  // B-insurer before names that merely contain a b. The list scrolls past
  // eight rows rather than being cut off.
  const q = debounced.trim().toLowerCase();
  const matches = [...filterInsurers(list, debounced)].sort(
    (a, b) => Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q))
  );
  // Hide once the typed value is already an exact pick — no point offering a
  // suggestion identical to what's in the field. Nothing until they type: an
  // empty field matches the whole list, and the whole list appearing on first
  // tap reads as "pick from these" — the opposite of what this field promises.
  const exact = matches.length === 1 && matches[0].toLowerCase() === value.trim().toLowerCase();
  const showDropdown = focused && q.length > 0 && value.trim().length > 0 && matches.length > 0 && !exact;

  const pick = (name: string) => {
    cancelPendingClose();
    onChangeText(name);
    setFocused(false);
  };
  const clear = () => {
    cancelPendingClose();
    onChangeText("");
    setDebounced("");
    setFocused(false);
  };

  return (
    // zIndex lifts the whole field (and its absolute dropdown) above the
    // sibling fields that follow it in the card.
    <View style={{ zIndex: 10 }}>
      <FieldLabel>{label}</FieldLabel>
      <View collapsable={false} style={{ justifyContent: "center" }}>
        <TouchableOpacity
          onPress={() => { setDebounced(value); setFocused(true); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ position: "absolute", left: 10, zIndex: 1 }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => { blurTimeout.current = setTimeout(() => setFocused(false), 150); }}
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

      {showDropdown && (
        <View
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: "#FFFFFF",
            borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden",
            shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
            elevation: 8,
            zIndex: 20,
          }}
        >
          <ScrollView ref={listRef} style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled" bounces={false} overScrollMode="never" nestedScrollEnabled>
            {matches.map((name, i) => (
              <TouchableOpacity
                key={name}
                onPress={() => pick(name)}
                style={{ paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border, backgroundColor: "#FFFFFF" }}
              >
                <Text style={{ color: colors.textDark, fontSize: 13, fontFamily: "Satoshi" }} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

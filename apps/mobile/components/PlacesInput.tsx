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
import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, Animated, Easing, Keyboard, Dimensions } from "react-native";
import { MagnifyingGlass } from "./icons";
import { colors } from "@quirksandall/shared";
import { FieldLabel, UNLOCK_PULSE_MS, UNLOCK_PULSE_PEAK_COLOR } from "./ui";

const KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
export const PLACES_ENABLED = !!KEY;

// Border-color animation needs an Animated-aware TextInput — plain style
// props on TextInput won't accept an Animated.Value.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Prediction = { description: string; place_id: string };
type Anchor = { x: number; y: number; width: number };

export function LabeledPlacesInput({
  label,
  value,
  onChangeText,
  onSelectPlace,
  manual = false,
  onToggleManual,
  onClear,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onSelectPlace: (p: { name: string; phone: string; address: string }) => void;
  // Whether this field is in "type it yourself" mode — the caller owns this
  // as state (it also unlocks the Address/Phone fields below), so it's
  // passed in rather than tracked locally. Drives both the placeholder here
  // ("Type clinic name" vs "Search clinic name") and which link renders below
  // — this used to be a one-way door (only a way IN to manual, no way back
  // to search), which is the "awkward exit" this fixes.
  manual?: boolean;
  onToggleManual?: () => void;
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
  const pulse = useRef(new Animated.Value(0)).current;
  // Skip the pulse on first mount — it should mark a CHANGE (the toggle link
  // was tapped), not fire just because the field exists. The placeholder/link
  // text swap is the permanent signal; this is only the momentary "look here"
  // for the instant it happens.
  const mounted = useRef(false);
  // The placeholder text itself can't be faded — it's drawn natively by the
  // TextInput, not a React node. `justToggled` opens a brief window where we
  // blank the native placeholder and draw our own Animated.Text in its place
  // instead, which CAN fade in. textFade drives both that and the "You can
  // type it in now" hint below the field — one fade-in, hold, fade-out timed
  // to the same window as the background pulse.
  const [justToggled, setJustToggled] = useState(false);
  const textFade = useRef(new Animated.Value(0)).current;
  const TEXT_FADE_IN_MS = 350;
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    pulse.setValue(1);
    Animated.timing(pulse, { toValue: 0, duration: UNLOCK_PULSE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    setJustToggled(true);
    textFade.setValue(0);
    Animated.sequence([
      Animated.timing(textFade, { toValue: 1, duration: TEXT_FADE_IN_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 0, duration: UNLOCK_PULSE_MS - TEXT_FADE_IN_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setJustToggled(false));
  }, [manual]);

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

  // Toggles both directions: escape hatch INTO manual entry for a clinic
  // Places doesn't have, and — the part that was missing — a way back OUT to
  // search without the only options being "clear the field" or leave the
  // Address/Phone fields stuck unlocked. Typed text is left as-is either way;
  // switching back to search just re-enables it as a live query.
  const toggleManual = () => {
    close();
    onToggleManual?.();
  };

  const showDropdown = focused && predictions.length > 0 && !!anchor;

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View ref={fieldRef} collapsable={false} style={{ justifyContent: "center" }}>
        {/* The magnifying glass means "this is a live search" — once manual
            mode is on, it isn't one anymore (typing here doesn't query
            Places), so showing it would be telling the user the opposite of
            what's true. */}
        {!manual && (
          <TouchableOpacity
            onPress={search}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: "absolute", left: 10, zIndex: 1 }}
          >
            <MagnifyingGlass size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <AnimatedTextInput
          value={value}
          onChangeText={(t: string) => { onChangeText(t); closeDropdown(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => { closeDropdown(); setFocused(false); }, 150)}
          onSubmitEditing={search}
          returnKeyType="search"
          blurOnSubmit={false}
          // Blanked during the fade window so the real (instant, native)
          // placeholder doesn't sit underneath making the overlay below moot.
          placeholder={justToggled ? "" : (manual ? "Add clinic name" : placeholder)}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={{
            minHeight: 40, borderRadius: 8, borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border,
            // The signal, on its own now — a border tweak was easy to miss,
            // and iOS shadow rendering on a TextInput is unreliable enough
            // not to trust. A wash across the whole field is a large,
            // unmissable area, and backgroundColor interpolation works
            // identically on iOS and Android — nothing native-only to fail
            // silently on.
            backgroundColor: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.background, UNLOCK_PULSE_PEAK_COLOR],
            }),
            paddingLeft: manual ? 12 : 34, paddingRight: value ? 34 : 12, paddingVertical: 8,
            fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi", color: colors.textDark,
          }}
        />
        {/* The placeholder-fade overlay — see justToggled above. Self-
            contained top/bottom/justifyContent rather than relying on the
            parent's centering, so it can't drift if that changes later. */}
        {justToggled && !value && (
          <View pointerEvents="none" style={{ position: "absolute", left: manual ? 12 : 34, top: 0, bottom: 0, justifyContent: "center" }}>
            <Animated.Text style={{ opacity: textFade, color: colors.textMuted, fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi" }}>
              {manual ? "Add clinic name" : placeholder}
            </Animated.Text>
          </View>
        )}
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
      {/* Transient hint — the second half of "flash the colour, then fade the
          text": one line, tied to the same textFade timeline, telling the
          user in words what the wash just showed them visually. Sits above
          the permanent toggle link rather than replacing it, and disappears
          on its own — it's a one-time nudge, not a persistent label. */}
      {justToggled && (
        <Animated.Text style={{ opacity: textFade, color: colors.primary, fontSize: 11, fontFamily: "Satoshi-Medium", marginTop: 4 }}>
          {manual ? "You can type it in now" : "Search away"}
        </Animated.Text>
      )}
      <TouchableOpacity onPress={toggleManual} style={{ marginTop: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi" }}>
          {manual ? "Search for it instead?" : "Can't find your clinic? Enter it manually"}
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

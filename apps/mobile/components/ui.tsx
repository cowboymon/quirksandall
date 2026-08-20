// Shared primitive UI components for the mobile app.
// Mirrors the prototype's primitives.tsx (fonts, buttons, dots, inputs).
import { useEffect, useMemo, useState, useRef, forwardRef } from "react";
import { Animated, Easing, Keyboard, StyleSheet, Text, TouchableOpacity, View, TextInput, Modal, Dimensions, type TextInputProps, type ViewProps } from "react-native";
import { CalendarDots, CaretDown, LockSimple, XCircle } from "./icons";
import { router, useNavigation } from "expo-router";
import { colors, radius, capitalizeFirst, capitalizeWords, formatPhone, displayDateToISO, dateFieldError } from "@quirksandall/shared";
import DatePickerSheet from "./DatePickerSheet";

// "‹ Back" for onboarding/stack screens. Uses the NEAREST navigator's goBack
// (via useNavigation) so it pops the current nested stack correctly — plain
// router.back() targets the root navigator and was a no-op inside onboarding.
// Falls back to the dashboard when there's nothing to pop (e.g. first step).
export function BackButton({ style }: { style?: ViewProps["style"] }) {
  const nav = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => (nav.canGoBack() ? nav.goBack() : router.replace("/dashboard"))}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[{ marginBottom: 16, alignSelf: "flex-start" }, style]}
    >
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>‹ Back</Text>
    </TouchableOpacity>
  );
}

// Keyboard types where sentence-casing the first char would be wrong.
const NON_TEXT_KEYBOARDS = ["numeric", "number-pad", "decimal-pad", "phone-pad", "email-address"];
function sentenceCased(keyboardType: TextInputProps["keyboardType"], onChangeText?: (t: string) => void) {
  if (!onChangeText) return undefined;
  if (keyboardType && NON_TEXT_KEYBOARDS.includes(keyboardType)) return onChangeText;
  return (t: string) => onChangeText(capitalizeFirst(t));
}
// Title-case each word — for person/pet name fields ("monica ralph" → "Monica Ralph").
function wordCased(onChangeText?: (t: string) => void) {
  if (!onChangeText) return undefined;
  return (t: string) => onChangeText(capitalizeWords(t));
}

export function Headline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text
      className={`text-foreground text-[34px] leading-tight ${className ?? ""}`}
      style={{ fontFamily: "Tanker" }}
    >
      {children}
    </Text>
  );
}

// Three roles from the prototype:
//  • default  → step / group label: 11px medium, muted (#987080)
//  • ochre    → rose section eyebrow (#B83A52)
//  • bold     → card section header: 11px bold, crimson (#510000)
export function Eyebrow({ children, ochre, bold }: { children: React.ReactNode; ochre?: boolean; bold?: boolean }) {
  return (
    <Text
      className={`text-[11px] uppercase tracking-[0.5px] ${ochre ? "text-primary" : bold ? "text-foreground" : "text-text-muted"}`}
      style={{ fontFamily: bold ? "Satoshi-Bold" : "Satoshi-Medium" }}
    >
      {children}
    </Text>
  );
}

// 10px medium uppercase micro-label sitting above an individual input,
// matching the prototype's field labels inside emergency cards.
// "Unlock to share" pill for paid-gated fields. Free/always-visible fields carry
// no label. Rose lock icon + text (#B83A52) to sit in the brand palette.
export function FieldTier() {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(184,58,82,0.12)",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <LockSimple size={10} color="#B83A52" weight="fill" />
      <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", letterSpacing: 0.2, color: "#B83A52" }}>Unlock to share</Text>
    </View>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted, marginBottom: 3 }}
    >
      {children}
    </Text>
  );
}

// A micro-labelled blush input — the standard field inside emergency-contact
// cards (Screen 2). 14px value on #F8ECEE, rose focus border.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Shared with PlacesInput.tsx so the search field and the Address/Phone
// fields it unlocks stay in lockstep — a felt duration, not a flash. The
// first attempt at this (500ms, linear, no shadow) read as a glitch rather
// than an effect; slow enough to actually track, eased so it reads as
// fading rather than snapping off.
//
// The fade-IN (TEXT_FADE_IN_MS, 350ms — see below) is separate and stays
// quick on purpose; only the fade-OUT this drives (background wash settling,
// text disappearing, and the locked-field chrome dissolving) needed slowing
// down — 2900 read as still a bit snappy for something meant to be noticed.
export const UNLOCK_PULSE_MS = 4200;
// A solid, fully-opaque colour rather than a translucent rgba — animating
// alpha and hue at once made the fade look like it passed through an
// unrelated colour partway, a real artifact of RGBA lerp, not a rendering
// bug. Keeping alpha constant at 1 throughout means only the hue moves.
//
// Deliberately LIGHTER than the field's normal colour, not more saturated —
// a bright flash reads as "notice me" the way a camera flash or a highlight
// does; the first version went darker/more-saturated instead and read as
// muddy rather than as an attention cue. Pure white read as *too* bright —
// this is a paler version of the same pink family (colors.background lifted
// toward white, not all the way), so it still reads as "this field" flashing
// rather than a generic UI flash.
export const UNLOCK_PULSE_PEAK_COLOR = "#FEF3F5";

export const LabeledInput = forwardRef<TextInput, TextInputProps & { label: string; phone?: boolean; name?: boolean; pulseOn?: unknown }>(function LabeledInput({
  label,
  style,
  onChangeText,
  phone,
  name,
  pulseOn,
  placeholder,
  ...props
}, ref) {
  const [focused, setFocused] = useState(false);
  // Same momentary border pulse as the vet-search field's manual-mode toggle
  // — used here for the Address/Phone fields it unlocks, so the whole
  // unlock reads as one event instead of the search field announcing itself
  // while these two silently change underneath. `pulseOn` is any value the
  // caller wants watched (e.g. the `manual` boolean); a change fires the
  // pulse, mount does not.
  const pulse = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);
  // editable={false} on this component only ever means "locked until the
  // vet search unlocks it" (the two places this is used: Address/Phone under
  // LabeledPlacesInput) — colors.secondary was too close to colors.background
  // to read as disabled at a glance, so this state gets a dashed border and a
  // lock icon on top of the tint, same visual language as the "New link"
  // dashed circle elsewhere in the app.
  const locked = props.editable === false;
  // Same placeholder-fade trick as PlacesInput — the native placeholder
  // can't animate, so this blanks it briefly and fades a matching
  // Animated.Text in its place instead. `placeholder` is destructured out
  // above so it can be overridden here regardless of prop spread order.
  const [justToggled, setJustToggled] = useState(false);
  const textFade = useRef(new Animated.Value(0)).current;
  const TEXT_FADE_IN_MS = 350;
  // The dashed border + padlock used to hard-cut in and out with `locked`
  // (an instant unmount, no transition at all) while everything else about
  // the unlock faded smoothly — this crossfades them instead. borderStyle
  // itself can't animate in RN (dashed vs solid isn't a numeric/color value),
  // so the dashed look lives on a separate absolutely-positioned overlay
  // whose opacity CAN animate, layered on top of the input's own (always
  // solid) border.
  const chromeOpacity = useRef(new Animated.Value(locked ? 1 : 0)).current;
  // Custom clear button, replacing iOS's native clearButtonMode here: the
  // native ✕ sits inside UIKit's own reserved inset, which lands well right
  // of this field's actual right edge and reads as off-balance against the
  // left text margin (no amount of paddingRight fully closes that gap — see
  // Input below, which still uses the native one and lives with it). This
  // one is a plain absolutely-positioned button, so it sits exactly where we
  // put it. Same visibility rule as native "while-editing": shown only when
  // focused and non-empty, not just whenever there's text.
  const clearHandler = phone && onChangeText
    ? (t: string) => onChangeText(formatPhone(t))
    : name
    ? wordCased(onChangeText)
    : sentenceCased(props.keyboardType, onChangeText);
  useEffect(() => {
    if (pulseOn === undefined) return;
    if (!mounted.current) { mounted.current = true; return; }
    pulse.setValue(1);
    // Ease-out cubic: fast to register, slow to fade — a linear fade of the
    // same length reads as "stuck" for its first half, since most of the
    // visible change happens in the last third either way.
    Animated.timing(pulse, { toValue: 0, duration: UNLOCK_PULSE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.timing(chromeOpacity, { toValue: locked ? 1 : 0, duration: UNLOCK_PULSE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    setJustToggled(true);
    textFade.setValue(0);
    Animated.sequence([
      Animated.timing(textFade, { toValue: 1, duration: TEXT_FADE_IN_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 0, duration: UNLOCK_PULSE_MS - TEXT_FADE_IN_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setJustToggled(false));
  }, [pulseOn]);
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View>
        <AnimatedTextInput
          ref={ref}
          autoCapitalize={name ? "words" : "sentences"}
          onChangeText={clearHandler}
          style={[
            {
              minHeight: 40, borderRadius: 8, borderWidth: 1,
              // Always solid — the dashed look is the overlay below. Colour
              // still crossfades between the locked tone and the normal
              // focus/border colour via chromeOpacity.
              borderColor: chromeOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [focused ? colors.primary : colors.border, colors.textMuted],
              }),
              // Same reasoning as PlacesInput's search field: a wash across the
              // whole field reads far more clearly than a border-width tweak,
              // and unlike shadow it renders identically on iOS and Android.
              backgroundColor: pulseOn === undefined
                ? (locked ? colors.secondary : colors.background)
                : pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [locked ? colors.secondary : colors.background, UNLOCK_PULSE_PEAK_COLOR],
                  }),
              paddingHorizontal: 12,
              // Room for the custom clear button when unlocked (32 matches
              // the locked padlock's own reserved space, so nothing jumps
              // width when chromeOpacity crossfades between the two).
              paddingRight: chromeOpacity.interpolate({ inputRange: [0, 1], outputRange: [32, 32] }),
              paddingVertical: 8,
              fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi", color: locked ? colors.textMuted : colors.textDark,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
          placeholder={justToggled ? "" : placeholder}
        />
        {/* Fades in the real placeholder text, not a hint sentence — "You can
            type it in now" is deliberately confined to the clinic-name field
            (PlacesInput) so it doesn't fire three times at once across a
            stack of fields. */}
        {justToggled && !props.value && (
          <View pointerEvents="none" style={{ position: "absolute", left: 12, top: 0, bottom: 0, justifyContent: "center" }}>
            <Animated.Text style={{ opacity: textFade, color: colors.textMuted, fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi" }}>
              {placeholder}
            </Animated.Text>
          </View>
        )}
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: colors.textMuted, opacity: chromeOpacity }}
        />
        {!locked && focused && !!props.value && (
          <TouchableOpacity
            onPress={() => clearHandler?.("")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear"
            style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center" }}
          >
            <XCircle size={17} color={colors.dashedBorder} weight="fill" />
          </TouchableOpacity>
        )}
        <Animated.View style={{ position: "absolute", right: 10, top: 0, bottom: 0, justifyContent: "center", opacity: chromeOpacity }} pointerEvents="none">
          <LockSimple size={14} weight="fill" color={colors.textMuted} />
        </Animated.View>
      </View>
    </View>
  );
});

// Masked DD/MM/YYYY (AU) text field. Operates on the display string; callers
// convert to/from ISO with displayDateToISO / isoToDisplayDate.
//
// Typed entry is kept here as the fallback path, but every field in the app
// now passes `pickerOnly` (see below), so date entry is one consistent
// interaction everywhere: tap, spin, Done.
//
// `range` picks both the allowed window and the picker style:
//   "birthday" — wheel, no future. Spinning the year column back beats
//                paging a calendar month by month.
//   "past"     — calendar grid, no future. Recent dates, e.g. "last seen".
//   "future"   — calendar grid, no past. Stay start/end dates.
// The calendar is deliberately given no NATIVE bounds (that combination
// aborts the app — see DatePickerSheet), so for those two ranges the window
// is enforced by `dateError` below and nothing else.
// `pickerOnly` drops typed entry entirely: the field is a button that opens
// the picker sheet, so no keyboard is ever involved. Preferred everywhere —
// it sidesteps the whole class of iOS numeric-keyboard problems (the number
// pad has no return key, so a numeric field in an overlay could trap the
// user; see #25) and makes date entry one consistent interaction.
export function DateInput({
  value,
  onChangeText,
  style,
  range = "past",
  pickerOnly,
  notBefore,
  ...props
}: TextInputProps & {
  onChangeText: (v: string) => void;
  range?: "birthday" | "past" | "future";
  pickerOnly?: boolean;
  // DD/MM/YYYY floor for this field, on top of whatever `range` allows. Used
  // for an end date that can't precede its start date: an empty field opens
  // the picker ON this date rather than today, and picking earlier is
  // flagged. Native bounds can't do this — the calendar aborts when given
  // them (see DatePickerSheet) — so it's enforced here.
  notBefore?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let f = digits;
    if (digits.length > 4) f = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) f = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChangeText(f);
  };

  // Seed the picker from whatever's already typed, so opening it continues the
  // entry rather than restarting from today.
  //
  // Memoised on the parsed string, not recomputed per render: an empty field
  // falls back to `new Date()`, which is a different timestamp every time.
  // The sheet re-seeds its draft whenever that value changes, so an unstable
  // seed meant setState on every render — an infinite loop that took the app
  // down whenever the picker was opened on a field with nothing typed in it.
  const parsed = displayDateToISO(value as string);
  const notBeforeISO = displayDateToISO(notBefore);
  // Open on the field's own value, else on the floor, else today.
  const seedISO = parsed ?? notBeforeISO;
  const seed = useMemo(() => (seedISO ? new Date(`${seedISO}T00:00:00`) : new Date()), [seedISO]);

  // Shared with the form gating Save (see dateFieldError in
  // @quirksandall/shared) — when only this component knew, an invalid date
  // could be shown in red here and saved anyway.
  const dateError = useMemo(
    () => dateFieldError(value as string, range, notBefore),
    [value, range, notBefore],
  );

  const commit = (d: Date) => {
    onChangeText(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    );
  };

  if (pickerOnly) {
    return (
      <View>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
          style={[
            {
              minHeight: 46, borderRadius: radius.input, borderWidth: 1,
              borderColor: dateError ? colors.danger : colors.border,
              backgroundColor: "#FFFFFF", paddingHorizontal: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            },
            style as any,
          ]}
        >
          <Text style={{ fontSize: 15, letterSpacing: 0, fontFamily: "Satoshi", color: value ? colors.textDark : colors.textMuted }}>
            {(value as string) || (props.placeholder ?? "DD/MM/YYYY")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* Per-field clear. Without it the only way to unset one date is
                whatever "clear everything" control the parent offers, which
                also throws away the other field. Nested Touchable, so the tap
                doesn't fall through and open the picker. */}
            {value ? (
              <TouchableOpacity
                onPress={() => onChangeText("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Clear date"
              >
                {/* Same brand-pink clear ✕ as LabeledInput/Input's custom
                    clear buttons — this field is a picker button with no
                    focus state, so it persists rather than appearing only
                    while editing, but matches their color/weight so all
                    three read as one affordance. */}
                <XCircle size={17} color={colors.dashedBorder} weight="fill" />
              </TouchableOpacity>
            ) : null}
            {/* Kept even when a value is set, so the "this opens a picker"
                affordance never disappears. */}
            <CalendarDots size={17} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
        <DatePickerSheet
          visible={showPicker}
          value={seed}
          range={range}
          onCancel={() => setShowPicker(false)}
          onConfirm={(d) => { commit(d); setShowPicker(false); }}
        />
        {/* Load-bearing, not decorative: the calendar picker runs WITHOUT
            native min/maxDate (passing them aborts the app — see
            DatePickerSheet), so this is the only thing standing between the
            owner and an out-of-range date. */}
        {dateError && (
          <Text style={{ color: colors.danger, fontSize: 11, marginTop: 4, fontFamily: "Satoshi" }}>{dateError}</Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={{ position: "relative", justifyContent: "center" }}>
      <Input
        value={value}
        onChangeText={handle}
        placeholder="DD/MM/YYYY"
        keyboardType="number-pad"
        maxLength={10}
        style={[{ paddingRight: 40 }, dateError ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      <TouchableOpacity
        onPress={() => {
          // The text field can still be focused (mid-typed digits) when this
          // is tapped — without dismissing first, the picker's own Modal
          // opens on top of an already-active keyboard instead of replacing
          // it, and nothing in that state can close the keyboard again.
          Keyboard.dismiss();
          setShowPicker(true);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ position: "absolute", right: 12 }}
      >
        <CalendarDots size={17} color={colors.textMuted} />
      </TouchableOpacity>
      </View>

      <DatePickerSheet
        visible={showPicker}
        value={seed}
        range={range}
        onCancel={() => setShowPicker(false)}
        onConfirm={(d) => { commit(d); setShowPicker(false); }}
      />
      {dateError && (
        <Text style={{ color: colors.danger, fontSize: 11, marginTop: 4, fontFamily: "Satoshi" }}>{dateError}</Text>
      )}
    </View>
  );
}

// Parse a stored time string into a 12-hour "h:mm" part + AM/PM period. Must be
// tolerant of PARTIAL entry ("7", "7:3") so a half-typed value round-trips back
// into the field instead of being wiped. Also converts legacy 24-hour values.
function parseTime12(value?: string | null): { hhmm: string; period: "AM" | "PM" } {
  const v = (value ?? "").trim();
  if (!v) return { hhmm: "", period: "AM" };
  const hasPeriod = /[ap]m/i.test(v);
  const period: "AM" | "PM" = /pm/i.test(v) ? "PM" : "AM";
  // digits + optional colon, before any AM/PM
  const core = v.replace(/\s*(am|pm)\s*$/i, "").trim();
  // A full 24-hour "HH:MM" with no period → convert to 12-hour.
  if (!hasPeriod) {
    const t = /^(\d{1,2}):(\d{2})$/.exec(core);
    if (t) {
      const H = parseInt(t[1], 10);
      if (H >= 13 || H === 0) return { hhmm: `${H % 12 || 12}:${t[2]}`, period: H >= 12 ? "PM" : "AM" };
      if (H === 12) return { hhmm: `12:${t[2]}`, period: "PM" };
      return { hhmm: `${H}:${t[2]}`, period: "AM" };
    }
  }
  return { hhmm: core, period };
}

// Mask raw digits into a 12-hour "h:mm". First digit 2–9 → single-digit hour;
// a leading 1 stays a two-digit hour only while it reads 10–12.
function maskTime12(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (!d) return "";
  if (d[0] === "1" && d.length === 1) return "1";
  let hourLen: number;
  if (d[0] >= "2") hourLen = 1;
  else if (d[0] === "1" && +d.slice(0, 2) >= 10 && +d.slice(0, 2) <= 12) hourLen = 2;
  else hourLen = 1;
  let h = parseInt(d.slice(0, hourLen), 10);
  if (h === 0 || h > 12) h = 12;
  const mm = d.slice(hourLen, hourLen + 2);
  if (!mm.length) return String(h);
  const m = mm.length === 2 ? String(Math.min(parseInt(mm, 10), 59)).padStart(2, "0") : mm;
  return `${h}:${m}`;
}

// 12-hour time field with an AM/PM toggle. Stores "h:mm AM" / "h:mm PM".
export function TimeInput({ value, onChangeText, style, placeholder, defaultPeriod }: { value: string; onChangeText: (v: string) => void; style?: TextInputProps["style"]; placeholder?: string; defaultPeriod?: "AM" | "PM" }) {
  const parsed = parseTime12(value);
  const hhmm = parsed.hhmm;
  // Empty field pre-selects defaultPeriod (e.g. PM for the dinner slot) so the
  // owner doesn't have to switch it; once they've typed a value its own period wins.
  const period = value && value.trim() ? parsed.period : (defaultPeriod ?? parsed.period);
  const commit = (nextHhmm: string, nextPeriod: "AM" | "PM") =>
    onChangeText(nextHhmm ? `${nextHhmm} ${nextPeriod}` : "");
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <Input
          value={hhmm}
          onChangeText={(raw) => commit(maskTime12(raw), period)}
          placeholder={placeholder ?? "7:30"}
          keyboardType="number-pad"
          maxLength={5}
          style={style}
        />
      </View>
      <View style={{ flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden" }}>
        {(["AM", "PM"] as const).map((p) => {
          const active = period === p;
          return (
            <TouchableOpacity key={p} onPress={() => commit(hhmm, p)} style={{ paddingHorizontal: 12, paddingVertical: 9, backgroundColor: active ? colors.cardDark : "#FFFFFF" }}>
              <Text style={{ fontSize: 13, fontFamily: "Satoshi-Medium", color: active ? colors.cardDarkText : colors.textMuted }}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        height: 46,
        borderRadius: radius.button,
        backgroundColor: colors.button,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
      activeOpacity={0.85}
    >
      <Text style={{ color: colors.buttonText, fontFamily: "Satoshi-Medium", fontSize: 15, letterSpacing: 0.3 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function SkipButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        height: 40,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: colors.dashedBorder,
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
      activeOpacity={0.7}
    >
      <Text style={{ color: colors.textMuted, fontFamily: "Satoshi", fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

// Single-line input. `filled` uses the blush surface the prototype uses inside
// emergency/routine cards; default is white with a rose focus border.
export const Input = forwardRef<TextInput, TextInputProps & { filled?: boolean; phone?: boolean; name?: boolean }>(function Input({ style, filled, phone, name, onFocus, onBlur, onChangeText, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  // Custom clear button, not the native clearButtonMode: UIKit reserves its
  // own inset beyond whatever paddingRight we give it, so the ✕ always sits
  // further right than the left text margin suggests it should — no amount
  // of padding tuning fully closed that gap. A plain absolutely-positioned
  // button sits exactly where we put it instead. Same visibility rule as
  // native "while-editing": shown only when focused and non-empty.
  const clearHandler = phone && onChangeText ? (t: string) => onChangeText(formatPhone(t)) : name ? wordCased(onChangeText) : sentenceCased(props.keyboardType, onChangeText);
  // Multiline fields never get the clear button — vertically centering it
  // across a tall box floats it mid-paragraph instead of pinned to one
  // corner, and reserving right-padding on every wrapped line (not just the
  // first) eats into the text width for no reason. iOS's native
  // clearButtonMode correctly no-op'd on multiline for the same reason; this
  // custom replacement has to opt out the same way.
  const showClear = !props.multiline;
  // The clear button needs a positioned wrapper, but callers style this
  // component as if it IS the field — `<Input style={{ flex: 2 }} />` and
  // friends. Left on the TextInput, those sizing props apply inside a
  // wrapper that has none of them, so the wrapper collapses to its content
  // and the caller's intended widths silently stop working. Layout props
  // are lifted to the wrapper; everything else (borders, padding, colours,
  // heights) stays on the field itself.
  const flat = StyleSheet.flatten(style) ?? {};
  const { flex, flexGrow, flexShrink, flexBasis, alignSelf, width, maxWidth, minWidth, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, ...fieldStyle } = flat as any;
  const wrapperStyle = { flex, flexGrow, flexShrink, flexBasis, alignSelf, width, maxWidth, minWidth, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical };
  return (
    <View style={wrapperStyle}>
      <TextInput
        ref={ref}
        // Sentence-case the first char programmatically so it works regardless of
        // the device's keyboard auto-capitalize setting (text fields only). Name
        // fields title-case every word instead ("monica ralph" → "Monica Ralph").
        autoCapitalize={name ? "words" : "sentences"}
        onChangeText={clearHandler}
        style={[
          {
            minHeight: 46,
            borderRadius: radius.input,
            borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border,
            backgroundColor: filled ? colors.secondary : "#FFFFFF",
            paddingLeft: 16,
            // Room for the custom clear button below — multiline fields
            // don't show it, so they keep the plain 16 on both sides.
            paddingRight: showClear ? 36 : 16,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: "Satoshi",
            color: colors.textDark,
            letterSpacing: 0, // guard against iOS placeholder letter-spacing quirk
          },
          fieldStyle,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
        // After the spread so it's a real default, not something the spread
        // clobbers: multiline usages grow with their content (callers set a
        // minHeight, not a fixed height), so nothing should ever scroll
        // internally — without this iOS's UITextView can still show a scroll
        // thumb, which reads as a broken field. A caller wanting a bounded,
        // scrollable box passes scrollEnabled explicitly.
        scrollEnabled={props.multiline ? props.scrollEnabled ?? false : props.scrollEnabled}
      />
      {showClear && focused && !!props.value && (
        <TouchableOpacity
          onPress={() => clearHandler?.("")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Clear"
          style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}
        >
          <XCircle size={17} color={colors.dashedBorder} weight="fill" />
        </TouchableOpacity>
      )}
    </View>
  );
});

// Numeric weight field with a persistent "kg" suffix (the unit stays visible
// after a value is entered). Stores the bare number.
// decimal-pad restricts the on-screen keyboard but not what actually lands in
// the field — paste, autofill, and some hardware keyboards can still put any
// character in, and the raw string was saved as-is. Strips everything but
// digits and a single decimal point, and caps it at 2 decimal places (XX.XX).
function sanitizeWeight(raw: string): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  const [intPart, decPart] = s.split(".");
  return decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : s;
}

// weight is stored as free text ("15" or "15 lb") — formatWeight() already
// treats any value containing a letter as carrying its own unit and leaves
// it untouched, a bare number as kg. Parsing/composing here just builds on
// that existing convention rather than needing a schema change for a unit
// column.
function parseWeight(raw: string): { amount: string; unit: "kg" | "lb" } {
  const trimmed = (raw ?? "").trim();
  const isLb = /lb/i.test(trimmed);
  return { amount: trimmed.replace(/[a-zA-Z]/g, "").trim(), unit: isLb ? "lb" : "kg" };
}
function composeWeight(amount: string, unit: "kg" | "lb"): string {
  if (!amount) return "";
  return unit === "lb" ? `${amount} lb` : amount;
}

export function WeightInput({ value, onChangeText, style }: { value: string; onChangeText: (v: string) => void; style?: TextInputProps["style"] }) {
  const [focused, setFocused] = useState(false);
  const { amount, unit } = parseWeight(value);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style as any]}>
      <View
        style={{
          flex: 1, minHeight: 46, borderRadius: radius.input, borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border, backgroundColor: "#FFFFFF",
          paddingHorizontal: 16, justifyContent: "center",
        }}
      >
        <TextInput
          value={amount}
          onChangeText={(v) => onChangeText(composeWeight(sanitizeWeight(v), unit))}
          placeholder="28"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ paddingVertical: 12, fontSize: 15, fontFamily: "Satoshi", color: colors.textDark, letterSpacing: 0 }}
        />
      </View>
      {/* kg/lb toggle — its own separate field, not nested inside the
          amount's border. Re-composes the same amount under the new unit
          rather than converting the number, since the owner is switching
          which unit they're about to type in, not asking for a conversion
          of what's already there. */}
      <View style={{ flexDirection: "row", height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, overflow: "hidden" }}>
        {(["kg", "lb"] as const).map((u) => (
          <TouchableOpacity
            key={u}
            onPress={() => onChangeText(composeWeight(amount, u))}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14, alignItems: "center", justifyContent: "center",
              backgroundColor: unit === u ? colors.cardDark : "#FFFFFF",
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Satoshi-Medium", color: unit === u ? colors.cardDarkText : colors.textMuted }}>{u}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Multiline variant for quirks / walks / notes.
export function Textarea({ style, filled, onFocus, onBlur, onChangeText, ...props }: TextInputProps & { filled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      multiline
      // No internal scrolling — these fields are meant to grow with their
      // content (minHeight only, no fixed height below), so nothing should
      // ever need to scroll. Without this, iOS's UITextView can still show
      // its scroll thumb in edge cases, which reads as a broken field.
      scrollEnabled={false}
      textAlignVertical="top"
      autoCapitalize="sentences"
      onChangeText={sentenceCased(props.keyboardType, onChangeText)}
      style={[
        {
          minHeight: 68,
          borderRadius: radius.input,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: filled ? colors.secondary : "#FFFFFF",
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 15,
          letterSpacing: 0, fontFamily: "Satoshi",
          color: colors.textDark,
          lineHeight: 21,
        },
        style,
      ]}
      placeholderTextColor={colors.textMuted}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      {...props}
    />
  );
}

// Contextual in-screen message bar.
//  info    → warm blush background, muted light text, no border.
//  paywall → dark plum card (matches the paywall hero), cream text + optional CTA.
export function InlineNote({
  children,
  variant = "info",
  cta,
  onCta,
}: {
  children: React.ReactNode;
  variant?: "info" | "paywall";
  cta?: string;
  onCta?: () => void;
}) {
  if (variant === "paywall") {
    return (
      <View style={{ backgroundColor: "#510000", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text style={{ fontSize: 13, color: "rgba(248,236,238,0.7)", fontFamily: "Satoshi-Light", lineHeight: 18 }}>{children}</Text>
        {cta && onCta && (
          <TouchableOpacity
            onPress={onCta}
            style={{ marginTop: 12, height: 32, alignSelf: "flex-start", paddingHorizontal: 16, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.15)", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#F8ECEE", fontSize: 12, fontFamily: "Satoshi-Medium" }}>{cta} →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: "Satoshi-Light", lineHeight: 18 }}>{children}</Text>
    </View>
  );
}

// Dropdown select — native equivalent of the prototype's <select>. Renders a
// white field that opens a modal option list. Matches Input styling.
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const triggerRef = useRef<View>(null);
  const screenH = Dimensions.get("window").height;

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  // Position the menu directly under the trigger, or above it when there isn't
  // room below — so it stays attached to the field rather than floating.
  const openUp = anchor ? anchor.y + anchor.height + 8 > screenH * 0.6 : false;
  const menuStyle = anchor
    ? openUp
      ? { position: "absolute" as const, left: anchor.x, width: anchor.width, bottom: screenH - anchor.y + 4 }
      : { position: "absolute" as const, left: anchor.x, width: anchor.width, top: anchor.y + anchor.height + 4 }
    : {};

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={openMenu}
        activeOpacity={0.7}
        style={{
          minHeight: 46, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border,
          backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 15, letterSpacing: 0, fontFamily: "Satoshi", color: value ? colors.textDark : colors.textMuted }}>
          {value || placeholder}
        </Text>
        <CaretDown size={14} color={colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Dim scrim so the fields behind the dropdown recede instead of showing
            through — the menu stays anchored to its trigger on top of it. */}
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(31,26,23,0.4)" }}>
          <View
            style={[
              { backgroundColor: "#FFFFFF", borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
              menuStyle,
            ]}
          >
            {options.map((opt, i) => (
              <TouchableOpacity
                key={opt}
                onPress={() => { onValueChange(opt); setOpen(false); }}
                style={{
                  paddingHorizontal: 16, paddingVertical: 13,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
                  backgroundColor: value === opt ? colors.secondary : "#FFFFFF",
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: "Satoshi", color: colors.textDark }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// 1-indexed, three states: completed (small crimson), current (wide crimson),
// upcoming (small border). Matches the prototype's ProgressDots.
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isCurrent = step === current;
        return (
          <View
            key={i}
            style={{
              width: isCurrent ? 20 : 8,
              height: 6,
              borderRadius: 3,
              backgroundColor: step <= current ? colors.button : colors.border,
            }}
          />
        );
      })}
    </View>
  );
}

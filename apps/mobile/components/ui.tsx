// Shared primitive UI components for the mobile app.
// Mirrors the prototype's primitives.tsx (fonts, buttons, dots, inputs).
import { useMemo, useState, useRef } from "react";
import { InputAccessoryView, Keyboard, Platform, Text, TouchableOpacity, View, TextInput, Modal, Dimensions, type TextInputProps, type ViewProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { colors, radius, capitalizeFirst, capitalizeWords, formatPhone, displayDateToISO } from "@quirksandall/shared";
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
      <Ionicons name="lock-closed" size={10} color="#B83A52" />
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
export function LabeledInput({
  label,
  style,
  onChangeText,
  phone,
  name,
  ...props
}: TextInputProps & { label: string; phone?: boolean; name?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        autoCapitalize={name ? "words" : "sentences"}
        onChangeText={phone && onChangeText ? (t) => onChangeText(formatPhone(t)) : name ? wordCased(onChangeText) : sentenceCased(props.keyboardType, onChangeText)}
        style={[
          {
            minHeight: 40, borderRadius: 8, borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border,
            backgroundColor: props.editable === false ? colors.secondary : colors.background,
            paddingHorizontal: 12, paddingVertical: 8,
            fontSize: 14, letterSpacing: 0, fontFamily: "Satoshi", color: props.editable === false ? colors.textMuted : colors.textDark,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </View>
  );
}

// iOS's number pad has NO return/done key, so a numeric field's keyboard can
// only be closed by tapping something that dismisses it — and inside a
// full-screen overlay (DurationModal) there may be nothing tappable that
// does. This accessory bar pins an explicit Done button above the keyboard
// so numeric entry always has a guaranteed way out. iOS-only by nature
// (Android's back button already dismisses).
const NUMERIC_DONE_ACCESSORY_ID = "numeric-done-accessory";

export function NumericDoneAccessory() {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={NUMERIC_DONE_ACCESSORY_ID}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", backgroundColor: "#F1F1F3", borderTopWidth: 1, borderTopColor: "#D8D8DC" }}>
        <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }} style={{ paddingHorizontal: 18, paddingVertical: 11 }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontFamily: "Satoshi-Bold" }}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

// Masked DD/MM/YYYY (AU) text field. Operates on the display string; callers
// convert to/from ISO with displayDateToISO / isoToDisplayDate.
//
// Typing stays the primary path — someone entering a date they already know
// shouldn't be dragged through a picker — with the calendar button as the
// alternative for dates people pick rather than recall.
//
// `range` names the job, which decides both bounds and picker style:
//   "birthday" — wheel, no future. Scrolling back years beats paging a
//                calendar month by month.
//   "past"     — calendar, no future. For recent dates ("last seen"), where
//                the week laid out is what you want.
//   "future"   — calendar, no past. Stay end dates.
export function DateInput({
  value,
  onChangeText,
  style,
  range = "past",
  ...props
}: TextInputProps & { onChangeText: (v: string) => void; range?: "birthday" | "past" | "future" }) {
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
  const seed = useMemo(() => (parsed ? new Date(`${parsed}T00:00:00`) : new Date()), [parsed]);

  // The parser already rejects impossible dates (35/08/1936 round-trips to
  // null) — but silently, so the form just accepted the text and dropped it
  // on save. Say so instead, once a full date has been typed. Range errors
  // follow the field's meaning: a birthday can't be in the future, an end
  // date can't be in the past (today is fine for both).
  const dateError = useMemo(() => {
    const s = (value as string) ?? "";
    if (s.length !== 10) return null;
    if (!parsed) return "That date doesn't exist — check the day and month";
    const todayISO = new Date().toISOString().slice(0, 10);
    if ((range === "birthday" || range === "past") && parsed > todayISO) return "That's in the future";
    if (range === "future" && parsed < todayISO) return "That date has already passed";
    return null;
  }, [value, parsed, range]);

  const commit = (d: Date) => {
    onChangeText(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    );
  };

  return (
    <View>
      <View style={{ position: "relative", justifyContent: "center" }}>
      <Input
        value={value}
        onChangeText={handle}
        placeholder="DD/MM/YYYY"
        keyboardType="number-pad"
        maxLength={10}
        inputAccessoryViewID={Platform.OS === "ios" ? NUMERIC_DONE_ACCESSORY_ID : undefined}
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
        <Ionicons name="calendar-outline" size={17} color={colors.textMuted} />
      </TouchableOpacity>
      </View>

      <NumericDoneAccessory />

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
export function Input({ style, filled, phone, name, onFocus, onBlur, onChangeText, ...props }: TextInputProps & { filled?: boolean; phone?: boolean; name?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      // Sentence-case the first char programmatically so it works regardless of
      // the device's keyboard auto-capitalize setting (text fields only). Name
      // fields title-case every word instead ("monica ralph" → "Monica Ralph").
      autoCapitalize={name ? "words" : "sentences"}
      onChangeText={phone && onChangeText ? (t) => onChangeText(formatPhone(t)) : name ? wordCased(onChangeText) : sentenceCased(props.keyboardType, onChangeText)}
      style={[
        {
          minHeight: 46,
          borderRadius: radius.input,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: filled ? colors.secondary : "#FFFFFF",
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 15,
          fontFamily: "Satoshi",
          color: colors.textDark,
          letterSpacing: 0, // guard against iOS placeholder letter-spacing quirk
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

// Numeric weight field with a persistent "kg" suffix (the unit stays visible
// after a value is entered). Stores the bare number.
export function WeightInput({ value, onChangeText, style }: { value: string; onChangeText: (v: string) => void; style?: TextInputProps["style"] }) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        {
          minHeight: 46, borderRadius: radius.input, borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border, backgroundColor: "#FFFFFF",
          paddingHorizontal: 16, flexDirection: "row", alignItems: "center",
        },
        style as any,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="28"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: "Satoshi", color: colors.textDark, letterSpacing: 0 }}
      />
      <Text style={{ fontSize: 15, letterSpacing: 0, fontFamily: "Satoshi-Medium", color: colors.textMuted, marginLeft: 6 }}>kg</Text>
    </View>
  );
}

// Multiline variant for quirks / walks / notes.
export function Textarea({ style, filled, onFocus, onBlur, onChangeText, ...props }: TextInputProps & { filled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      multiline
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
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>▾</Text>
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

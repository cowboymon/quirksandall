// Shared primitive UI components for the mobile app.
// Mirrors the prototype's primitives.tsx (fonts, buttons, dots, inputs).
import { useState } from "react";
import { Text, TouchableOpacity, View, TextInput, Modal, type TextInputProps, type ViewProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, capitalizeFirst, formatPhone } from "@quirksandall/shared";

// Keyboard types where sentence-casing the first char would be wrong.
const NON_TEXT_KEYBOARDS = ["numeric", "number-pad", "decimal-pad", "phone-pad", "email-address"];
function sentenceCased(keyboardType: TextInputProps["keyboardType"], onChangeText?: (t: string) => void) {
  if (!onChangeText) return undefined;
  if (keyboardType && NON_TEXT_KEYBOARDS.includes(keyboardType)) return onChangeText;
  return (t: string) => onChangeText(capitalizeFirst(t));
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
  ...props
}: TextInputProps & { label: string; phone?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        autoCapitalize="sentences"
        onChangeText={phone && onChangeText ? (t) => onChangeText(formatPhone(t)) : sentenceCased(props.keyboardType, onChangeText)}
        style={[
          {
            minHeight: 40, borderRadius: 8, borderWidth: 1,
            borderColor: focused ? colors.primary : colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: 12, paddingVertical: 8,
            fontSize: 14, fontFamily: "Satoshi", color: colors.textDark,
          },
          style,
        ]}
        placeholderTextColor={colors.dashedBorder}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </View>
  );
}

// Masked DD/MM/YYYY (AU) text field. Operates on the display string; callers
// convert to/from ISO with displayDateToISO / isoToDisplayDate.
export function DateInput({ value, onChangeText, style, ...props }: TextInputProps & { onChangeText: (v: string) => void }) {
  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let f = digits;
    if (digits.length > 4) f = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) f = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChangeText(f);
  };
  return (
    <Input
      value={value}
      onChangeText={handle}
      placeholder="DD/MM/YYYY"
      keyboardType="number-pad"
      maxLength={10}
      style={style}
      {...props}
    />
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
export function TimeInput({ value, onChangeText, style, placeholder }: { value: string; onChangeText: (v: string) => void; style?: TextInputProps["style"]; placeholder?: string }) {
  const { hhmm, period } = parseTime12(value);
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

export function SkipButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        height: 40,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: colors.dashedBorder,
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
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
export function Input({ style, filled, phone, onFocus, onBlur, onChangeText, ...props }: TextInputProps & { filled?: boolean; phone?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      // Sentence-case the first char programmatically so it works regardless of
      // the device's keyboard auto-capitalize setting (text fields only).
      autoCapitalize="sentences"
      onChangeText={phone && onChangeText ? (t) => onChangeText(formatPhone(t)) : sentenceCased(props.keyboardType, onChangeText)}
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
      <Text style={{ fontSize: 15, fontFamily: "Satoshi-Medium", color: colors.textMuted, marginLeft: 6 }}>kg</Text>
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
          fontFamily: "Satoshi",
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
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          minHeight: 46, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border,
          backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 15, fontFamily: "Satoshi", color: value ? colors.textDark : colors.textMuted }}>
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 32 }}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: radius.card, overflow: "hidden" }}>
            {options.map((opt, i) => (
              <TouchableOpacity
                key={opt}
                onPress={() => { onValueChange(opt); setOpen(false); }}
                style={{
                  paddingHorizontal: 20, paddingVertical: 16,
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

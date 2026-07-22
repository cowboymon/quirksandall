// Shared primitive UI components for the mobile app.
// Mirrors the prototype's primitives.tsx (fonts, buttons, dots, inputs).
import { useState } from "react";
import { Text, TouchableOpacity, View, TextInput, type TextInputProps, type ViewProps } from "react-native";
import { colors, radius } from "@quirksandall/shared";

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

export function Eyebrow({ children, ochre }: { children: React.ReactNode; ochre?: boolean }) {
  return (
    <Text
      className={`text-[11px] uppercase tracking-[0.5px] ${ochre ? "text-primary" : "text-text-muted"}`}
      style={{ fontFamily: "Satoshi-Medium" }}
    >
      {children}
    </Text>
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
export function Input({ style, filled, onFocus, onBlur, ...props }: TextInputProps & { filled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
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

// Multiline variant for quirks / walks / notes.
export function Textarea({ style, filled, onFocus, onBlur, ...props }: TextInputProps & { filled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      multiline
      textAlignVertical="top"
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

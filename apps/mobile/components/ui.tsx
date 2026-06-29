// Shared primitive UI components for the mobile app
import { Text, TouchableOpacity, View, TextInput, type TextInputProps, type ViewProps } from "react-native";
import { colors, buttonHeight, radius } from "@quirksandall/shared";

export function Headline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text
      className={`text-primary text-[32px] leading-tight ${className ?? ""}`}
      style={{ fontFamily: "Spectral_700BoldItalic" }}
    >
      {children}
    </Text>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-text-muted text-[11px] uppercase tracking-[0.5px] font-medium">
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
        height: buttonHeight,
        borderRadius: radius.button,
        backgroundColor: disabled ? "#8A7A72" : colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
      activeOpacity={0.85}
    >
      <Text style={{ color: "#F7E9C9", fontWeight: "600", fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SkipButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: "center", paddingVertical: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
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

export function Input({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      style={[
        {
          height: buttonHeight,
          borderRadius: radius.input,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBg,
          paddingHorizontal: 14,
          fontSize: 16,
          color: colors.textDark,
        },
        style,
      ]}
      placeholderTextColor={colors.textMuted}
      {...props}
    />
  );
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}

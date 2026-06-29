import { TouchableOpacity, View, Text } from "react-native";
import { colors } from "@quirksandall/shared";

type Props = { label: string; checked: boolean; onToggle: (v: boolean) => void };

export default function CheckboxRow({ label, checked, onToggle }: Props) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(!checked)}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 12 }}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 20, height: 20, borderRadius: 4,
          borderWidth: 1.5,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : "#FFFFFF",
          alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}
      >
        {checked && (
          <Text style={{ color: "#F7E9C9", fontSize: 12, fontWeight: "700" }}>✓</Text>
        )}
      </View>
      <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{label}</Text>
    </TouchableOpacity>
  );
}

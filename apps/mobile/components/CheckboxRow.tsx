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
          borderColor: checked ? colors.button : colors.border,
          backgroundColor: checked ? colors.button : colors.cardBg,
          alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}
      >
        {checked && (
          <Text style={{ color: "#F8ECEE", fontSize: 12, fontFamily: "Satoshi-Bold" }}>✓</Text>
        )}
      </View>
      <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>{label}</Text>
    </TouchableOpacity>
  );
}

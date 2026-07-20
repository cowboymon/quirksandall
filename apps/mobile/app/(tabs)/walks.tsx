// "Dogs I walk" — walker-mode shell. Empty state only for v1; the navigation
// skeleton exists so this tab can be populated post-launch without
// restructuring. Deliberately styled in the dark register so owner mode and
// walker mode can never be mistaken for each other.
import { View, Text } from "react-native";
import { colors } from "@quirksandall/shared";

export default function DogsIWalk() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardDark }}>
      <View style={{ paddingTop: 76, paddingHorizontal: 24 }}>
        <Text style={{ color: colors.cardDarkLabel, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "500" }}>
          Walker mode
        </Text>
        <Text style={{ fontFamily: "Tanker", fontSize: 32, lineHeight: 38, color: colors.cardDarkText, marginTop: 6 }}>
          Dogs I walk
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingBottom: 80 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🐕</Text>
        <Text style={{ color: colors.cardDarkText, fontSize: 16, fontWeight: "600", textAlign: "center" }}>
          Nothing here yet.
        </Text>
        <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 21 }}>
          When an owner shares a profile with you, it lands here. Ask them for their link.
        </Text>
      </View>
    </View>
  );
}

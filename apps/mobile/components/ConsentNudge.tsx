// Ghost-tinted caution banner — ambient enough not to look like a save-blocking
// validation error (consent is a legitimate choice), but a plain caution-coloured
// line of text under the checkbox read as too recessive to notice. Mirrors the
// web recipient page's "Is [pet] missing?" banner treatment (a light tint card
// with a border), just in caution amber instead of danger rose. Shared between
// onboarding step2 and edit/emergency — was copy-pasted identically in both.
import { View, Text } from "react-native";
import { colors } from "@quirksandall/shared";
import { WarningCircle } from "./icons";

export default function ConsentNudge({ name, petName }: { name: string; petName?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginTop: 10,
        padding: 10,
        borderRadius: 10,
        backgroundColor: "rgba(127,90,48,0.08)",
        borderWidth: 1,
        borderColor: "rgba(127,90,48,0.25)",
      }}
    >
      <WarningCircle size={16} color={colors.caution} weight="duotone" style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: colors.caution, fontSize: 12, fontFamily: "Satoshi-Medium", lineHeight: 17 }}>
        Whoever's looking after {petName || "your pet"} won't see {name || "this contact"}'s details until this is ticked.
      </Text>
    </View>
  );
}

// Shared wrapper for all edit screens: a sticky header (Back + Tanker title +
// Save) that stays put while the content scrolls beneath it.
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "@quirksandall/shared";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  loading?: boolean;
  // Hide the top-right Save (for screens that render their own bottom button).
  hideSave?: boolean;
  // Lets a screen scroll its own content (e.g. deep-linking to a section).
  scrollRef?: React.RefObject<ScrollView | null>;
};

export default function EditShell({ title, subtitle, children, onSave, saving, saveLabel = "Save", loading, hideSave, scrollRef }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8ECEE" }}>
      {/* Sticky header — Back + Tanker title + Save */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 58,
          paddingBottom: 12,
          backgroundColor: "#F8ECEE",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ minWidth: 52 }}>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontFamily: "Satoshi-Bold", fontSize: 16, color: colors.textDark }}>
          {title}
        </Text>
        <View style={{ minWidth: 52, alignItems: "flex-end" }}>
          {hideSave ? null : (
            <TouchableOpacity onPress={onSave} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontSize: 15, fontFamily: "Satoshi-Bold" }}>{saveLabel}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          // Cap the content column so fields don't stretch edge-to-edge on wide
          // screens (tablets/large devices); on phones this sits above the
          // screen width so it flexes down and has no effect.
          contentContainerStyle={{ padding: 24, paddingBottom: 60, width: "100%", maxWidth: 600, alignSelf: "center" }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {subtitle ? (
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 20, fontFamily: "Satoshi-Light" }}>
              {subtitle}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      )}
    </View>
  );
}

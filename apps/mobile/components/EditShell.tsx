// Shared wrapper for all edit screens: a slim Back/Save nav bar on top, then a
// big Tanker headline (the screen title) at the top of the scrolling content —
// matching the prototype's edit-mode header.
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
};

export default function EditShell({ title, subtitle, children, onSave, saving, saveLabel = "Save", loading, hideSave }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8ECEE" }}>
      {/* Slim nav bar — Back + Save, always visible */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>‹ Back</Text>
        </TouchableOpacity>
        {hideSave ? (
          <View style={{ width: 40 }} />
        ) : (
          <TouchableOpacity onPress={onSave} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontSize: 15, fontFamily: "Satoshi-Bold" }}>{saveLabel}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {/* Big prominent screen header */}
          <Text style={{ fontFamily: "Tanker", fontSize: 34, lineHeight: 40, color: colors.textDark, marginBottom: subtitle ? 8 : 20 }}>
            {title}
          </Text>
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

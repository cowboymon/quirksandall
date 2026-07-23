// Shared wrapper for all edit screens: back button, title, save button, scroll container
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors } from "@quirksandall/shared";

type Props = {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  loading?: boolean;
  // Hide the top-right Save (for screens that render their own bottom button).
  hideSave?: boolean;
};

export default function EditShell({ title, children, onSave, saving, saveLabel = "Save", loading, hideSave }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8ECEE" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 60,
          paddingBottom: 12,
          backgroundColor: "#F8ECEE",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 16, color: colors.textDark }}>{title}</Text>
        {hideSave ? (
          <View style={{ width: 40 }} />
        ) : (
          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
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
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

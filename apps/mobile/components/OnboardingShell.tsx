// Shared wrapper for the scrolling onboarding steps: a sticky header (Back +
// progress dots) that stays put while the form scrolls beneath it — same
// pattern as EditShell and the poster screen, so headers behave consistently
// app-wide.
import { View, ScrollView } from "react-native";
import { colors } from "@quirksandall/shared";
import { BackButton, ProgressDots } from "./ui";

export default function OnboardingShell({ step, total = 4, children }: { step: number; total?: number; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8ECEE" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 58,
          paddingBottom: 12,
          backgroundColor: "#F8ECEE",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ minWidth: 52 }}>
          <BackButton style={{ marginBottom: 0 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <ProgressDots total={total} current={step} />
        </View>
        <View style={{ minWidth: 52 }} />
      </View>
      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        // Without this, collapsing command cards above the fold (#19) shrinks
        // the content height out from under the current scroll offset, and
        // the ScrollView clamps to the new (much shorter) max — which reads
        // as the page freezing then jumping to the bottom. This keeps
        // whatever's currently on screen anchored instead of letting the
        // offset get reinterpreted against the new content size.
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        contentContainerStyle={{ padding: 24, paddingTop: 20, paddingBottom: 48, width: "100%", maxWidth: 600, alignSelf: "center" }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

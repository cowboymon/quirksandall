import { Stack } from "expo-router";
import { useRequireAuth } from "../../hooks/useRequireAuth";

export default function OnboardingLayout() {
  useRequireAuth();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8ECEE" } }} />
  );
}

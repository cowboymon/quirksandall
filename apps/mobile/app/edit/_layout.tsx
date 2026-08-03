import { Stack } from "expo-router";
import { useRequireAuth } from "../../hooks/useRequireAuth";

export default function EditLayout() {
  useRequireAuth();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F8ECEE" },
        animation: "slide_from_right",
      }}
    />
  );
}

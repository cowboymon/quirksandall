import { Stack } from "expo-router";

export default function EditLayout() {
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

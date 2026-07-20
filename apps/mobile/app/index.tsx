import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/auth");
      }
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#510000" />
    </View>
  );
}

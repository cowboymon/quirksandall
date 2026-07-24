import { useCallback, useState } from "react";
import { ScrollView, TouchableOpacity, View, Text, Image } from "react-native";
import { supabase } from "../lib/supabase";
import { useActivePetStore } from "../stores/activePet";
import { colors } from "@quirksandall/shared";
import { router, useFocusEffect } from "expo-router";

type PetSummary = { id: string; name: string; photo_url: string | null };

// Always-visible horizontal pet switcher (matches the prototype). Add-pet is
// gated: free tier routes to the upgrade screen, paid starts a new onboarding.
export default function PetSwitcher({ isPaid }: { isPaid: boolean }) {
  const { petId, setPetId } = useActivePetStore();
  const [pets, setPets] = useState<PetSummary[]>([]);

  // Re-fetch on focus (not just mount) so a photo/name added on the edit screen
  // shows up when returning to the dashboard.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (!user) return;
        const { data } = await supabase
          .from("pets")
          .select("id, name, photo_url")
          .eq("owner_id", user.id)
          .eq("status", "active")
          .order("created_at");
        setPets(data ?? []);
      })();
    }, [])
  );

  const activeId = petId ?? pets[0]?.id;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 10, alignItems: "flex-start" }}
    >
      {pets.map((p) => {
        const active = p.id === activeId;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => setPetId(p.id)}
            style={{ alignItems: "center", gap: 6, opacity: active ? 1 : 0.5 }}
            activeOpacity={0.8}
          >
            {p.photo_url ? (
              <Image
                source={{ uri: p.photo_url }}
                style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: active ? colors.cardDark : colors.border }}
              />
            ) : (
              <View
                style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: colors.secondary,
                  borderWidth: 2, borderColor: active ? colors.cardDark : colors.border,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: "Tanker", fontSize: 20, color: colors.textMuted }}>
                  {p.name?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 11, fontFamily: "Satoshi-Medium", color: active ? colors.textDark : colors.textMuted }}>
              {p.name || "New pet"}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => router.push(isPaid ? "/onboarding/step1" : "/upgrade")}
        style={{ alignItems: "center", gap: 6, opacity: 0.6 }}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: 56, height: 56, borderRadius: 28,
            borderWidth: 2, borderColor: colors.dashedBorder, borderStyle: "dashed",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 24, lineHeight: 26 }}>+</Text>
        </View>
        <Text style={{ fontSize: 11, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>Add pet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

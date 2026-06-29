import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View, Text, Image } from "react-native";
import { supabase } from "../lib/supabase";
import { useActivePetStore } from "../stores/activePet";
import { colors } from "@quirksandall/shared";
import { router } from "expo-router";

type PetSummary = { id: string; name: string; photo_url: string | null };

type Props = { isPaid: boolean };

export default function PetSwitcher({ isPaid }: Props) {
  const { petId, setPetId } = useActivePetStore();
  const [pets, setPets] = useState<PetSummary[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pets")
        .select("id, name, photo_url")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("created_at");
      setPets(data ?? []);
    })();
  }, []);

  // Only render if there's more than one pet (or we're paid, to show the add button)
  if (pets.length <= 1 && !isPaid) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}
    >
      {pets.map((p) => {
        const active = p.id === petId;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => setPetId(p.id)}
            style={{ alignItems: "center", gap: 4 }}
          >
            {p.photo_url ? (
              <Image
                source={{ uri: p.photo_url }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : colors.border,
                }}
              />
            ) : (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: active ? colors.primary : "#FFFFFF",
                  borderWidth: 2,
                  borderColor: active ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>🐾</Text>
              </View>
            )}
            <Text
              style={{
                fontSize: 11,
                color: active ? colors.primary : colors.textMuted,
                fontWeight: active ? "700" : "400",
              }}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Add pet — paid only */}
      {isPaid && (
        <TouchableOpacity
          onPress={() => router.push("/onboarding/step1")}
          style={{ alignItems: "center", gap: 4 }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              borderWidth: 1.5,
              borderColor: colors.dashedBorder,
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 24 }}>+</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Add pet</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

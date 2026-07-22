import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useActivePetStore } from "../stores/activePet";

export type ActivePet = {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed: string | null;
  dob: string;
  dob_is_estimated: boolean;
  sex: string | null;
  weight: string | null;
  color_markings: string | null;
  photo_url: string | null;
  description_for_id: string | null;
  microchip_number: string | null;
};

export function useActivePet() {
  const { petId: storedPetId, setPetId } = useActivePetStore();
  const [pet, setPet] = useState<ActivePet | null>(null);
  const [petId, setPetIdLocal] = useState<string | null>(storedPetId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not logged in"); setLoading(false); return; }

      let query = supabase.from("pets").select("*").eq("owner_id", user.id).eq("status", "active");

      // Use stored selection if available, otherwise fall back to first pet
      if (storedPetId) {
        query = query.eq("id", storedPetId);
      } else {
        query = query.order("created_at").limit(1);
      }

      const { data, error: e } = await query.single();

      if (e || !data) { setError(e?.message ?? "No pet found"); setLoading(false); return; }
      setPet(data);
      setPetIdLocal(data.id);
      if (!storedPetId) setPetId(data.id); // persist first-pet selection
      setLoading(false);
    })();
  }, [storedPetId]);

  return { pet, petId, loading, error };
}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  microchip_number: string | null;
};

export function useActivePet() {
  const [pet, setPet] = useState<ActivePet | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not logged in"); setLoading(false); return; }

      const { data, error: e } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("created_at")
        .limit(1)
        .single();

      if (e || !data) { setError(e?.message ?? "No pet found"); setLoading(false); return; }
      setPet(data);
      setPetId(data.id);
      setLoading(false);
    })();
  }, []);

  return { pet, petId, loading, error };
}

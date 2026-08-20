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
  const { petId: storedPetId, setPetId, cachedPet, setCachedPet } = useActivePetStore();

  // Seed from the dashboard's cache when it matches the current selection so
  // edit screens render instantly instead of blocking on a fresh round-trip.
  const seeded = cachedPet && (!storedPetId || cachedPet.id === storedPetId) ? cachedPet : null;
  const [pet, setPet] = useState<ActivePet | null>(seeded);
  const [petId, setPetIdLocal] = useState<string | null>(seeded?.id ?? storedPetId);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Only show the blocking spinner when we have nothing cached to render;
      // otherwise revalidate silently behind the already-visible content.
      if (!seeded) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      if (!user) { setError("Not logged in"); setLoading(false); return; }

      // Resolve the stored selection; if it no longer maps to an active pet
      // (stale selection, deleted/archived pet, or a leftover id from before
      // a pet swap), fall back to the earliest active pet instead of erroring
      // out — matches dashboard.tsx's own fallback, so a stale id doesn't
      // leave this screen (and every other edit screen using this hook)
      // rendering blank with no explanation.
      let data: ActivePet | null = null;
      if (storedPetId) {
        const res = await supabase.from("pets").select("*").eq("owner_id", user.id).eq("status", "active").eq("id", storedPetId).maybeSingle();
        data = res.data;
      }
      if (!data) {
        const res = await supabase.from("pets").select("*").eq("owner_id", user.id).eq("status", "active").order("created_at").limit(1).maybeSingle();
        data = res.data;
      }

      if (!data) { setError("No pet found"); setLoading(false); return; }
      setPet(data);
      setPetIdLocal(data.id);
      setCachedPet(data); // keep the shared cache fresh for the next screen
      if (data.id !== storedPetId) setPetId(data.id); // persist the resolved selection
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedPetId]);

  return { pet, petId, loading, error };
}

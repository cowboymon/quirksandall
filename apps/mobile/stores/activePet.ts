import { create } from "zustand";
import type { ActivePet } from "../hooks/useActivePet";

type ActivePetStore = {
  petId: string | null;
  setPetId: (id: string) => void;
  // Cache of the full pet row, populated by the dashboard after it loads. Edit
  // screens read this synchronously so they can render instantly instead of
  // blocking on a fresh round-trip; useActivePet still revalidates in the
  // background so the cache never goes stale.
  cachedPet: ActivePet | null;
  setCachedPet: (pet: ActivePet | null) => void;
};

export const useActivePetStore = create<ActivePetStore>((set) => ({
  petId: null,
  setPetId: (id) => set({ petId: id }),
  cachedPet: null,
  setCachedPet: (pet) => set({ cachedPet: pet }),
}));

import { create } from "zustand";

type ActivePetStore = {
  petId: string | null;
  setPetId: (id: string) => void;
};

export const useActivePetStore = create<ActivePetStore>((set) => ({
  petId: null,
  setPetId: (id) => set({ petId: id }),
}));

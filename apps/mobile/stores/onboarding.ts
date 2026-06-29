import { create } from "zustand";
import type { Command } from "@quirksandall/shared";

type PetDraft = {
  photoUri?: string;
  name?: string;
  breed?: string;
  species?: string;
  dob?: string;
  dobIsEstimated?: boolean;
  sex?: string;
  weight?: string;
  colorMarkings?: string;
  microchipNumber?: string;
  vetClinic?: string;
  vetPhone?: string;
  emergVetClinic?: string;
  emergVetPhone?: string;
  insuranceProvider?: string;
  insurancePolicy?: string;
  backupName?: string;
  backupRelationship?: string;
  backupPhone?: string;
  backupConsent?: boolean;
  pin?: string;
  commands?: Command[];
  scared?: string;
  noGo?: string;
  flightRisk?: string;
  feedingBrand?: string;
  feedingBreakfastTime?: string;
  feedingBreakfastAmount?: string;
  feedingDinnerTime?: string;
  feedingDinnerAmount?: string;
  feedingTreatsType?: string;
  feedingTreatsLimit?: string;
  feedingNotes?: string;
  walks?: string;
  sleep?: string;
  bathroomHabits?: string;
  allergies?: string;
  medications?: string;
  conditions?: string;
};

type OnboardingStore = {
  pet: PetDraft;
  setPet: (partial: Partial<PetDraft>) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  pet: {},
  setPet: (partial) => set((s) => ({ pet: { ...s.pet, ...partial } })),
  reset: () => set({ pet: {} }),
}));

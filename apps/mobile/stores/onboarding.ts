import { create } from "zustand";
import type { Command } from "@quirksandall/shared";
import type { EditableMedication } from "../components/MedicationsEditor";

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
  vetContactName?: string;
  vetClinic?: string;
  vetAddress?: string;
  vetPhone?: string;
  emergVetClinic?: string;
  emergVetPhone?: string;
  insuranceProvider?: string;
  insurancePolicy?: string;
  backupName?: string;
  backupRelationship?: string;
  backupPhone?: string;
  backupConsent?: boolean;
  backupIsDecisionContact?: boolean;
  backup2Name?: string;
  backup2Relationship?: string;
  backup2Phone?: string;
  backup2Consent?: boolean;
  backup2IsDecisionContact?: boolean;
  pin?: string;
  commands?: Command[];
  scared?: string;
  noGo?: string;
  flightRisk?: string;
  temperament?: string;
  feedingBrand?: string;
  feedingBreakfastTime?: string;
  feedingBreakfastAmount?: string;
  feedingLunchTime?: string;
  feedingLunchAmount?: string;
  feedingDinnerTime?: string;
  feedingDinnerAmount?: string;
  feedingTreatsType?: string;
  feedingTreatsLimit?: string;
  feedingNotes?: string;
  walks?: string;
  sleep?: string;
  bathroomHabits?: string;
  leftAloneOk?: string;
  leftAloneDetail?: string;
  toileting?: string;
  allergies?: string;
  medications?: EditableMedication[];
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

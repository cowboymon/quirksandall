// Core domain types — source of truth for both apps/web and apps/mobile

export type PurchaseStatus = "free" | "paid";

export type Owner = {
  id: string;
  name: string;
  primaryPhone: string;
  primaryEmail: string;
  purchaseStatus: PurchaseStatus;
  petCountLimit: number; // 1 if free, Infinity if paid
  purchaseRestoredAt?: string;
};

export type BackupContact = {
  name: string;
  relationship: string;
  phone: string;
  consentToShare: boolean;
};

export type Pet = {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  dob: string; // ISO date string
  dobIsEstimated: boolean;
  sex: string;
  weight: string;
  colorMarkings: string;
  photoUrl?: string;
  microchipNumber?: string;
  status: "active" | "archived";
};

export type VetInfo = {
  primaryVet: { contactName?: string; clinic: string; address?: string; phone: string };
  emergencyVet: { clinic: string; phone: string };
  insurance: { provider: string; policyNumber: string };
};

// Which feeding slot a medication is given with (#94), or "anytime".
export type MealSlot = "breakfast" | "lunch" | "dinner" | "anytime";

export type Medication = {
  name: string;
  dose: string;
  frequency: string;
  timeOfDay: string;
  locationStored: string;
  notes: string;
  withMeal?: MealSlot;
};

export type PetMedical = {
  allergies: string[]; // always visible to recipients
  conditions: string[]; // free — always visible to recipients
  medications: Medication[]; // free — always visible to recipients
};

// Document vault (§5.4) — vaccination certs, flea/worm records. Files live in a
// private storage bucket; this is the metadata row.
export type PetDocumentKind = "vaccination" | "flea_worm" | "other";

export type PetDocument = {
  id: string;
  petId: string;
  kind: PetDocumentKind;
  title?: string;
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: string;
};

export type FeedingSlot = { time: string; amount: string };

export type PetRoutine = {
  feeding: {
    brand: string;
    breakfast: FeedingSlot;
    lunch: FeedingSlot;
    dinner: FeedingSlot;
    treats: { type: string; limit: string };
    notes: string;
  };
  walks: string;
  sleep: string;
  bathroomHabits: string;
  leftAlone: string;
  toileting: string;
};

export type CommandStrength = "learning" | "solid" | "mastered";

export type Command = {
  id: string;
  word: string;
  meaning: string;
  howToCue: string;
  reward: string;
  lastConfirmedAt?: string;
  // Paid organisation. Array order is canonical; hidden commands are kept but
  // withheld from the recipient/dashboard.
  hidden?: boolean;
  // How reliable this command is — shown to sitters as a small tag (#92).
  strength?: CommandStrength;
};

export type PetBehavior = {
  commands: Command[];
  quirksTriggers: string[];
  escapeRisk: { flag: boolean; notes: string };
  temperamentSummary: string;
  scared: string;
  noGo: string;
  flightRisk: string;
};

export type ShareLinkMode = "quick" | "full";

export type ShareLink = {
  id: string;
  petId: string;
  token: string;
  pinHash?: string;
  mode: ShareLinkMode;
  expiresAt?: string;
  revoked: boolean;
  createdAt: string;
  lastViewedAt?: string;
  lastViewedBy?: string;
};

export type PinAttempt = {
  id: string;
  linkId: string;
  timestamp: string;
  ip: string;
  success: boolean;
};

// Full profile as seen by a recipient (assembled server-side)
export type RecipientProfile = {
  pet: Pick<Pet, "name" | "species" | "breed" | "photoUrl" | "microchipNumber" | "sex" | "weight" | "colorMarkings">;
  age: string; // computed, never raw DOB
  behavior: Pick<PetBehavior, "commands" | "quirksTriggers" | "escapeRisk" | "scared" | "noGo" | "flightRisk" | "temperamentSummary">;
  allergies: string[]; // always shown
  // Whether the owner set a PIN. When false, there is nothing to gate, so the
  // emergency block is shown openly (and emergencyContacts is populated below).
  pinSet: boolean;
  // Present when the owner set NO pin (shown openly) OR after PIN unlock:
  emergencyContacts?: {
    primaryVet: VetInfo["primaryVet"];
    emergencyVet: VetInfo["emergencyVet"];
    insurance: VetInfo["insurance"];
    ownerContact: { name: string; phone: string };
    backupContacts: BackupContact[];
    vetPreAuth?: boolean;
  };
  // Only present on paid tier:
  routine?: PetRoutine;
  medical?: Pick<PetMedical, "conditions" | "medications">;
  lastUpdatedAt: string;
  mode: ShareLinkMode;
  isPaid: boolean;
  // Stay-duration orientation phrase (§5.1), e.g. "for a few days" / "until
  // Sat 3 Aug". Present only when the owner set a duration on this link.
  stayNote?: string;
  // Owner-only preview (opened from the app with ?preview=1): shows the full
  // picture — including paid-tier routine/medical — regardless of tier. The
  // links sent to sitters never set this, so they stay gated.
  preview?: boolean;
};

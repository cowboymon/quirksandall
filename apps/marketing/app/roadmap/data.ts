// Single source of truth for the roadmap. The page renders it and the vote API
// validates item ids against VOTABLE_IDS so no arbitrary id can be voted on.
//
// The forward-looking items (building / next / exploring) are placeholders —
// directional, not promises. Edit freely. The "shipped" items are real, so
// they carry no vote control.

export type Tone = "building" | "next" | "exploring";

export type RoadmapItem = { id: string; title: string; desc: string };

export type RoadmapColumn = {
  status: string;
  tone: Tone;
  items: RoadmapItem[];
};

// Already built — factual, no voting.
export const SHIPPED: RoadmapItem[] = [
  {
    id: "shipped-profile",
    title: "A shareable pet profile",
    desc: "One link with everything a stand-in needs — food, meds, vet, quirks and all.",
  },
  {
    id: "shipped-meds",
    title: "Medication & feeding schedules",
    desc: "What to give, how much, and when. Never behind a paywall.",
  },
  {
    id: "shipped-poster",
    title: "A missing-pet poster",
    desc: "A clean, printable poster in seconds if the worst ever happens.",
  },
  {
    id: "shipped-standin",
    title: "Access for your stand-in",
    desc: "Share just what they need, for as long as they need it.",
  },
  {
    id: "shipped-standin-poster",
    title: "Your stand-in can raise the alarm too",
    desc: "Right from the link you shared — they don't need to track you down first to get a poster out.",
  },
  {
    id: "shipped-documents",
    title: "A vault for the paperwork",
    desc: "Vaccination certificates, insurance and worming records — stored privately, ready when you need them.",
  },
  {
    id: "shipped-pin-contacts",
    title: "Emergency contacts behind your own PIN",
    desc: "Vet, insurer and backup contacts stay locked to you — set a PIN and only you can get in.",
  },
  {
    id: "shipped-commands",
    title: "Commands and quirks, spelled out",
    desc: "The word, what it means, the reward, and how solid it really is — plus the quirks worth knowing about.",
  },
  {
    id: "shipped-stay-length",
    title: "Tell them how long the stay is",
    desc: "Pick a length or set the dates — whoever opens the link sees exactly how long they're needed for.",
  },
];

export const COLUMNS: RoadmapColumn[] = [
  {
    status: "Building now",
    tone: "building",
    items: [
      {
        id: "checkins",
        title: "Stand-in check-ins",
        desc: "Let whoever's watching tick off the walk, the feed, the meds — so you can see it's done.",
      },
    ],
  },
  {
    status: "Next up",
    tone: "next",
    items: [
      {
        id: "poster-pdf",
        title: "Poster as a print-ready PDF",
        desc: "Download the missing poster as a PDF with a scannable QR code.",
      },
      {
        id: "gift-codes",
        title: "Gift & redemption codes",
        desc: "Unlock the paid features with a code — handy for gifting, or for rescues.",
      },
    ],
  },
  {
    status: "Exploring",
    tone: "exploring",
    items: [
      {
        id: "reminders",
        title: "Reminders & nudges",
        desc: "Gentle prompts for medications and feeding times, on their phone.",
      },
      {
        id: "link-per-stay",
        title: "A link per kind of stay",
        desc: "A quick-sit link and a full-boarding link — each showing just what that person needs.",
      },
      {
        id: "command-notes",
        title: "Stand-in notes on how commands held up",
        desc: "Let whoever's watching mark how solid a command actually was during the stay — so its strength reflects real life, not just how it goes at home.",
      },
      {
        id: "note-back",
        title: "A note back from the stand-in",
        desc: "“She was a bit off her food today” — straight to you.",
      },
      {
        id: "insurance",
        title: "Pet insurance, if you want it",
        desc: "Optional, opt-in offers from partners. Never your data without asking.",
      },
      {
        id: "household",
        title: "Invite someone into your household",
        desc: "A partner or family member gets their own sign-in to the same pets — no sharing your login.",
      },
    ],
  },
];

// Every id that can receive a vote — used by the API to reject anything else.
export const VOTABLE_IDS: Set<string> = new Set(
  COLUMNS.flatMap((c) => c.items.map((i) => i.id)),
);

export const DOT: Record<Tone, string> = {
  building: "#467049", // green — in progress
  next: "#B83A52", // rose — planned
  exploring: "#987080", // muted — ideas
};

export type VoteCounts = { up: number; down: number };
export type CountsMap = Record<string, VoteCounts>;

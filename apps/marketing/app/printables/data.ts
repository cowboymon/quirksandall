// Printable, print-and-handwrite templates rendered in the brand style at
// /printables/[slug]. Modelled as structured blocks (not raw Markdown) so the
// printed form has real labelled fill-lines, tables, and write-in areas.

export type Block =
  | { kind: "fields"; heading: string; note?: string; items: { label: string; hint?: string }[] }
  | { kind: "table"; heading: string; note?: string; columns: string[]; rows: number }
  | { kind: "write"; heading: string; note?: string; lines: number }
  | { kind: "permission"; heading: string; quote: string; items: { label: string; hint?: string }[] };

export type Printable = {
  slug: string;
  title: string;
  intro: string;
  blocks: Block[];
  footnote: string;
};

export const PRINTABLES: Printable[] = [
  {
    slug: "pet-sitter-instructions",
    title: "Pet Sitter Instructions",
    intro:
      "Fill it in once. Update it before every stay. Hand it to anyone — a professional sitter, a friend, a neighbour.",
    blocks: [
      {
        kind: "fields",
        heading: "Pet basics",
        items: [
          { label: "Pet name" },
          { label: "Species" },
          { label: "Breed" },
          { label: "Age" },
          { label: "Weight" },
          { label: "Microchip number" },
          { label: "Distinguishing markings", hint: "useful if they ever go missing" },
        ],
      },
      {
        kind: "fields",
        heading: "Feeding",
        items: [
          { label: "Food type / brand" },
          { label: "Amount" },
          { label: "Times" },
          { label: "Treats — allowed / not allowed" },
          { label: "Water — where, how often refreshed" },
        ],
      },
      {
        kind: "fields",
        heading: "Routine",
        items: [
          { label: "Walks — how long, how often, on/off lead" },
          { label: "Toileting — where, how often" },
          { label: "Sleep — where, any quirks" },
        ],
      },
      {
        kind: "fields",
        heading: "Medical",
        items: [
          { label: "Vet name / clinic" },
          { label: "Vet phone" },
          { label: "After-hours / emergency vet" },
          { label: "After-hours phone" },
          { label: "Medications — what, dose, when, how administered" },
          { label: "Allergies or conditions" },
          { label: "Written permission to seek emergency treatment (yes/no)" },
          { label: "Spending limit before they check with you" },
          { label: "Backup decision-maker if you're unreachable" },
          { label: "Backup contact's phone" },
        ],
      },
      {
        kind: "fields",
        heading: "Behaviour and quirks",
        items: [
          { label: "Commands they respond to", hint: "the real ones, not the textbook ones" },
          { label: "Known triggers" },
          { label: "Something that looks weird but is completely normal" },
          { label: "How they are with strangers, kids, other animals" },
        ],
      },
      {
        kind: "fields",
        heading: "House logistics",
        items: [
          { label: "Where things live", hint: "food, leads, litter, meds" },
          { label: "Off-limits areas" },
          { label: "Keys / alarm code / parking" },
        ],
      },
      {
        kind: "fields",
        heading: "Contact",
        items: [
          { label: "Your number / best way to reach you" },
          { label: "How often you'd like updates" },
          { label: 'What counts as a "call me now" situation' },
        ],
      },
      {
        kind: "write",
        heading: "Anything else",
        note: "Anything that doesn't fit in a section above — write it here.",
        lines: 4,
      },
    ],
    footnote:
      "Quirks & All keeps this current automatically once you're set up — no more re-texting a sitter the same details before every trip. A static template goes stale the moment a medication or vet changes; that's the one thing paper can't fix for you.",
  },
  {
    slug: "pet-emergency-information-card",
    title: "Pet Emergency Information Card",
    intro:
      "Print it, pin it up, or keep it in your sitter's bag. Everything they need if something actually goes wrong.",
    blocks: [
      {
        kind: "fields",
        heading: "Pet",
        items: [{ label: "Pet name" }, { label: "Species / breed" }],
      },
      {
        kind: "fields",
        heading: "Your regular vet",
        items: [
          { label: "Clinic name" },
          { label: "Phone" },
          { label: "Address" },
          { label: "Hours" },
        ],
      },
      {
        kind: "fields",
        heading: "After-hours / emergency vet",
        items: [{ label: "Clinic name" }, { label: "Phone" }, { label: "Address" }],
      },
      {
        kind: "permission",
        heading: "Permission to act",
        quote:
          "The person listed below is authorised to seek emergency veterinary treatment for my pet on my behalf while I'm away.",
        items: [{ label: "Sitter's name" }, { label: "Your name (signed)" }, { label: "Date" }],
      },
      {
        kind: "fields",
        heading: "Spending limit",
        items: [
          { label: "Go ahead without calling me, up to ($)" },
          { label: "Above that — try me, then call" },
        ],
      },
      {
        kind: "fields",
        heading: "Backup decision-maker",
        note: "If I can't be reached, this person can make the call.",
        items: [{ label: "Name" }, { label: "Phone" }, { label: "Relationship to you" }],
      },
      {
        kind: "write",
        heading: "Allergies, conditions & current medication",
        lines: 4,
      },
      {
        kind: "fields",
        heading: "You",
        items: [
          { label: "Your name" },
          { label: "Your phone" },
          { label: "Preferred contact method" },
        ],
      },
    ],
    footnote:
      "Quirks & All keeps emergency contacts and permissions behind a PIN on your pet's profile, so a sitter isn't hunting through old texts for a number from three sits ago.",
  },
  {
    slug: "medication-schedule",
    title: "Cat & Dog Medication Schedule",
    intro:
      "One row per medication. Update it the day anything changes — a dose, a timing, a new tablet.",
    blocks: [
      {
        kind: "fields",
        heading: "Pet",
        items: [
          { label: "Pet name" },
          { label: "Species" },
          { label: "Weight" },
          { label: "Vet / clinic phone" },
        ],
      },
      {
        kind: "table",
        heading: "Medication schedule",
        columns: ["Medication", "Dose", "Time(s) of day", "How it's given", "Course dates", "Notes"],
        rows: 6,
      },
      {
        kind: "write",
        heading: "How this medication is actually administered",
        note: "The trick that gets a tablet into your pet without a standoff — hidden in food, given by hand, pill popper, whatever actually works for them specifically.",
        lines: 4,
      },
    ],
    footnote:
      "Reviewed against general veterinary handover guidance. This isn't medical advice — confirm dosing and administration with your own vet before a stay. Doses and vets change more often than people update a fridge printout; Quirks & All keeps this schedule current on the same link every time.",
  },
];

export function getPrintable(slug: string): Printable | undefined {
  return PRINTABLES.find((p) => p.slug === slug);
}

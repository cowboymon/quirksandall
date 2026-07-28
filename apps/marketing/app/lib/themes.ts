// Fixed set of feedback themes. The AI tagger must return exactly one of these
// (validated server-side); the admin groups suggestions by them. Keep the list
// short and stable — adding a theme means past suggestions won't be re-tagged.
export const THEMES = [
  "Sharing & links",
  "Reminders & check-ins",
  "Cats & other species",
  "Medical & safety",
  "Missing pet / poster",
  "Pricing & unlock",
  "Sitter experience",
  "Something else",
] as const;

export type Theme = (typeof THEMES)[number];

export const UNTAGGED = "Untagged";

// Resolution states shown/settable in the admin.
export const STATUSES = ["new", "planned", "resolved"] as const;
export type Status = (typeof STATUSES)[number];

// Pet insurers offered as suggestions in the emergency screen's Insurance card.
//
// Suggestions only — never a constraint. The field accepts anything typed, so
// an insurer that's missing, newly launched, or overseas is never a dead end.
// That matters because these lists go stale constantly: brands merge, get
// underwritten by someone else, and come and go.
//
// AU list: Insurance Council of Australia's pet insurance category, verbatim
// (insurancecouncil.com.au/insurer-category/pet-insurance). Some entries are
// legal entities rather than consumer brands (Bupa Australia Pty Ltd, Pacific
// International Insurance Limited) and some are underwriters people won't
// recognise from their policy (PetSure, Hollard) — kept as published rather
// than second-guessed, since substring matching finds them either way.
const AU_INSURERS = [
  "AAMI",
  "AHM",
  "Australian Seniors Insurance Agency",
  "Australian Unity",
  "Blue Badge Insurance Australia",
  "Bow Wow Meow Pet Insurance",
  "Budget Direct",
  "Bupa Australia Pty Ltd",
  "CBA Insurance",
  "Everyday Insurance",
  "Fetch Pet",
  "Hollard Australia",
  "Pacific International Insurance Limited",
  "PD Insurance",
  "Petsy",
  "PetSure",
  "RAC (WA)",
  "RACQ (QLD)",
  "Real Insurance",
  "RSPCA",
];

// No verified NZ list yet — rather than guess at brand names, NZ gets the same
// plain free-text field it has today. Drop a list in here and it lights up.
const BY_REGION: Record<string, string[]> = {
  AU: AU_INSURERS,
};

/** Suggestions for a region code ("AU", "NZ"…), or none where we have no
 * verified list. An empty array means the field behaves as plain free text. */
export function insurersForRegion(region: string | null | undefined): string[] {
  if (!region) return [];
  return BY_REGION[region.toUpperCase()] ?? [];
}

/** Case-insensitive substring match, so "bupa" finds "Bupa Australia Pty Ltd"
 * and "rspca" finds "RSPCA". Returns everything when nothing's typed yet. */
export function filterInsurers(list: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((n) => n.toLowerCase().includes(q));
}

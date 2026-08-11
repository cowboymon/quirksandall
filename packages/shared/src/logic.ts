// Pure business logic — no React, no platform deps

/**
 * Compute a human-readable age string from a DOB ISO string.
 * Always computed — never stored as a static number.
 */
export function computeAge(dob: string, isEstimated: boolean): string {
  const birth = new Date(dob);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedYears =
    months < 0 || (months === 0 && now.getDate() < birth.getDate())
      ? years - 1
      : years;
  const adjustedMonths =
    months < 0 ? 12 + months : months;

  const prefix = isEstimated ? "~" : "";
  if (adjustedYears >= 2) return `${prefix}${adjustedYears} years old`;
  if (adjustedYears === 1 && adjustedMonths === 0) return `${prefix}1 year old`;
  if (adjustedYears === 1) return `${prefix}1 year ${adjustedMonths}mo`;
  if (adjustedMonths === 0) return `${prefix}less than a month old`;
  return `${prefix}${adjustedMonths} month${adjustedMonths !== 1 ? "s" : ""} old`;
}

/**
 * Convert a stored ISO date (YYYY-MM-DD) to the AU display format DD/MM/YYYY.
 * Returns "" for empty/invalid input.
 */
export function isoToDisplayDate(iso?: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Parse a DD/MM/YYYY string to an ISO date (YYYY-MM-DD). Returns null when the
 * string is incomplete or not a real calendar date.
 */
export function displayDateToISO(s?: string | null): string | null {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const dd = +m[1], mm = +m[2], yyyy = +m[3];
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Trim a name and render its possessive form ("Olive " → "Olive's"). */
export function possessive(name?: string | null): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  return n.endsWith("s") ? `${n}'` : `${n}'s`;
}

/**
 * Format an Australian phone number for display with readable spacing.
 * Mobile → 0424 002 474 · Landline → (02) 6294 1228 · Toll-free → 1800 678 387.
 * Falls back to the original string when it doesn't look like an AU number.
 */
export function formatPhone(value?: string | null): string {
  if (!value) return "";
  const d = value.replace(/[^\d]/g, "");
  if (d.length === 10 && d.startsWith("04")) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`; // mobile
  if (d.length === 10 && (d.startsWith("1800") || d.startsWith("1300"))) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`; // toll-free / 1300
  if (d.length === 10 && d.startsWith("0")) return `(${d.slice(0, 2)}) ${d.slice(2, 6)} ${d.slice(6)}`; // landline
  if (d.length === 6 && d.startsWith("13")) return `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`; // 13 XX XX
  return value.trim();
}

/** Prefix a vet's name with "Dr." when the user didn't. */
export function formatVetName(value?: string | null): string {
  const n = (value ?? "").trim();
  if (!n) return "";
  return /^(dr\.?|doctor|prof\.?|professor)\b/i.test(n) ? n : `Dr. ${n}`;
}

/**
 * Sentence-case the first character of a string. Used to force sentence case on
 * free-text fields regardless of the device keyboard's auto-capitalize setting.
 */
export function capitalizeFirst(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Title-case a person/pet name for input fields ("monica ralph" → "Monica
 * Ralph"). Only uppercases the first letter of each word — after a space,
 * apostrophe, or hyphen ("o'brien" → "O'Brien", "mary-jane" → "Mary-Jane") —
 * and never touches interior or already-capitalised letters, so intentional
 * casing like "McDonald" is preserved. Safe to run on every keystroke.
 */
export function capitalizeWords(s: string): string {
  return s.replace(/(?:^|[\s'-])[a-z]/g, (m) => m.toUpperCase());
}

/**
 * The single canonical command order, used identically on the dashboard, the
 * edit screen, and the recipient page so they never disagree.
 *
 * Free tier: chronological — the stored array order, all commands shown.
 * Paid tier: the owner's manual array order; hidden commands withheld unless
 * `includeHidden` (the edit screen, where hidden ones show at the bottom so the
 * owner can un-hide them).
 */
export function orderedCommands<T extends { hidden?: boolean }>(
  commands: T[],
  isPaid: boolean,
  includeHidden = false,
): T[] {
  if (!isPaid) return commands.slice();
  const shown = commands.filter((c) => !c.hidden);
  // Manual array order is canonical; hidden commands are withheld from sitters
  // (appended last only when the owner is editing).
  if (includeHidden) return [...shown, ...commands.filter((c) => c.hidden)];
  return shown;
}

/** Medication meal-slot label (#94) — e.g. "with breakfast", or null when unset. */
export function mealSlotLabel(slot?: string | null): string | null {
  switch (slot) {
    case "breakfast": return "with breakfast";
    case "lunch": return "with lunch";
    case "dinner": return "with dinner";
    case "anytime": return "anytime";
    default: return null;
  }
}

/** Command "strength" (§#92) — how reliable the command is, shown to sitters as
 * a small tag. Returns the label or null when unset. */
export function commandStrengthLabel(s?: string | null): string | null {
  switch (s) {
    case "learning": return "Still learning";
    case "solid": return "Solid";
    case "mastered": return "Mastered";
    default: return null;
  }
}

/**
 * Format a weight value for display. Stored values are usually a bare number
 * ("15"); append " kg" unless the value already carries a unit/letter.
 */
export function formatWeight(value?: string | null): string {
  if (!value) return "";
  const v = value.trim();
  if (!v) return "";
  // Already has a unit or any non-numeric character → leave as the owner wrote it.
  return /[a-zA-Z]/.test(v) ? v : `${v} kg`;
}

// PIN rate-limiting constants (enforced server-side in edge function)
export const PIN_MAX_ATTEMPTS = 20;
export const PIN_WINDOW_MINUTES = 15;

export type PinCheckResult =
  | { allowed: false; reason: "cooldown"; waitSeconds: number }
  | { allowed: true };

/**
 * Client-safe rate-limit check — used for UI feedback only.
 * Actual enforcement happens in the Supabase Edge Function.
 */
export function checkPinRateLimit(
  attempts: { timestamp: string }[],
  windowMs = PIN_WINDOW_MINUTES * 60 * 1000
): PinCheckResult {
  const now = Date.now();
  const recent = attempts.filter(
    (a) => now - new Date(a.timestamp).getTime() < windowMs
  );
  if (recent.length >= PIN_MAX_ATTEMPTS) {
    const oldest = recent.reduce((min, a) =>
      new Date(a.timestamp).getTime() < new Date(min.timestamp).getTime() ? a : min
    );
    const waitSeconds = Math.ceil(
      (new Date(oldest.timestamp).getTime() + windowMs - now) / 1000
    );
    return { allowed: false, reason: "cooldown", waitSeconds };
  }
  return { allowed: true };
}

/** Pluralise a wrong-PIN log message for the owner dashboard. */
export function pinAttemptLabel(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "1 wrong PIN guess today.";
  if (count >= 5) return `${count} wrong PIN guesses today — you may want to check who has the PIN.`;
  return `${count} wrong PIN guesses today.`;
}

/** Freemium gate helpers */
export function canAddPet(currentPetCount: number, purchaseStatus: "free" | "paid"): boolean {
  if (purchaseStatus === "paid") return true;
  return currentPetCount < 1;
}

export function canRotateLink(purchaseStatus: "free" | "paid"): boolean {
  return purchaseStatus === "paid";
}

export function canSeeRoutine(purchaseStatus: "free" | "paid"): boolean {
  return purchaseStatus === "paid";
}

export function canSeeMedical(purchaseStatus: "free" | "paid"): boolean {
  return purchaseStatus === "paid";
}

/** Validate a DD/MM/YYYY date field. Returns the message to show under the
 * field, or null when it's fine (including while it's still half-typed).
 *
 * Lives here, not in the component, because two callers need the same answer:
 * DateInput renders the message, and the form gating Save needs to know
 * whether it may proceed. When only the component knew, an invalid date could
 * be shown in red and saved anyway.
 *
 *   range     "birthday" | "past" — no future dates
 *             "future"            — no past dates
 *   notBefore extra floor (DD/MM/YYYY), e.g. an end date that can't precede
 *             its start date.
 */
export function dateFieldError(
  value?: string | null,
  range: "birthday" | "past" | "future" = "past",
  notBefore?: string | null,
  now: Date = new Date(),
): string | null {
  const s = (value ?? "").trim();
  if (s.length !== 10) return null; // still being entered — don't nag
  const parsed = displayDateToISO(s);
  if (!parsed) return "That date doesn't exist — check the day and month";
  const todayISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if ((range === "birthday" || range === "past") && parsed > todayISO) return "That's in the future";
  if (range === "future" && parsed < todayISO) return "That date has already passed";
  const floor = displayDateToISO(notBefore);
  if (floor && parsed < floor) return "Can't be before the start date";
  return null;
}

/** Stay duration, COMPACT — for the owner's dashboard, where each link gets
 * one narrow row and a spelled-out "from Sat 12 Aug until Tue 15 Aug" wraps.
 * Dates are bare DD/MM; the caller supplies the "Staying " prefix:
 *
 *   both dates   "Staying 12/08 – 15/08"
 *   end only     "Staying until 15/08"
 *   start only   "Staying for a few days from 12/08"
 *   preset only  "Staying for a few days"
 *
 * The sitter-facing recipient page uses stayStatus() instead, which spells
 * dates out in full and describes the phase in a complete sentence.
 */
export function stayPhrase(preset?: string | null, endsAt?: string | null, startsAt?: string | null): string | null {
  const dd = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const parse = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const end = parse(endsAt);
  const start = parse(startsAt);

  // A stay that has already ended tells the owner something false — "until
  // 15/08" read on the 20th implies it's still running. Once the end date
  // passes nothing is shown, not even the preset ("for a few days" is equally
  // stale once the stay it described is over). Enforced here so every surface
  // inherits it. Valid through the whole of the end day, not up to its
  // midnight: a stay "until 15/08" still applies at 6pm on the 15th.
  if (end) {
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    if (endOfDay.getTime() < Date.now()) return null;
  }

  // Only a start still in the future is worth the space — one that has
  // arrived is just "the stay is on", which the end date already conveys.
  let startAhead: Date | null = null;
  if (start) {
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    if (dayStart.getTime() > Date.now()) startAhead = start;
  }

  if (end && startAhead) return `${dd(startAhead)} – ${dd(end)}`;
  if (end) return `until ${dd(end)}`;
  const phrase = stayPresetPhrase(preset);
  if (startAhead) return phrase ? `${phrase} from ${dd(startAhead)}` : `from ${dd(startAhead)}`;
  return phrase;
}

/** Sitter-facing stay status (§5.1) — a COMPLETE sentence describing where
 * the stay is up to, or null when the owner set nothing. Distinct from
 * stayPhrase(), which returns a compact fragment for the owner's dashboard.
 *
 * Four phases:
 *   before   "3 days until Olive is with you — Sat 12 Aug to Tue 15 Aug."
 *   during   "Olive's with you from Sat 12 Aug to Tue 15 Aug."
 *   ending   "Olive's with you for another 2 days — until Tue 15 Aug."
 *   over     "Olive is no longer staying with you."
 *
 * All comparisons are day-granular: a stay "until Tue 15 Aug" is still on at
 * 6pm on the 15th. `now` is injectable so the phases are testable without
 * mocking the clock. Safe to compute per request — the recipient page is
 * force-dynamic, so the countdown is never served from a cache.
 */
const STAY_ENDING_SOON_DAYS = 3;

export function stayStatus(
  petName: string,
  preset?: string | null,
  endsAt?: string | null,
  startsAt?: string | null,
  now: Date = new Date(),
): string | null {
  const name = (petName ?? "").trim() || "Your pet";
  const poss = possessive(name);

  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const parse = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : dayStart(d);
  };
  // Whole calendar days between two day-starts. Rounded because DST shifts an
  // interval by an hour, which would otherwise floor a clean 3 days to 2.
  const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const today = dayStart(now);
  const start = parse(startsAt);
  const end = parse(endsAt);

  // Over. Stated plainly rather than silently dropping the banner, so a sitter
  // who opens an old link learns the stay finished instead of seeing nothing.
  if (end && daysBetween(today, end) < 0) return `${name} is no longer staying with you.`;

  // Not started. Only a start still in the future counts — one that has arrived
  // is just "during", below.
  if (start && daysBetween(today, start) > 0) {
    const n = daysBetween(today, start);
    if (n === 1) return `${name} is with you from tomorrow${end ? ` until ${fmt(end)}` : ""}.`;
    const tail = end ? ` — ${fmt(start)} to ${fmt(end)}` : ` — from ${fmt(start)}`;
    return `${n} days until ${name} is with you${tail}.`;
  }

  // Under way, with a known end.
  if (end) {
    const left = daysBetween(today, end);
    if (left === 0) return `${poss} with you until the end of today.`;
    if (left === 1) return `${poss} with you for one more day — until ${fmt(end)}.`;
    if (left <= STAY_ENDING_SOON_DAYS) return `${poss} with you for another ${left} days — until ${fmt(end)}.`;
    return start
      ? `${poss} with you from ${fmt(start)} to ${fmt(end)}.`
      : `${poss} with you until ${fmt(end)}.`;
  }

  // No end date: fall back to the fuzzy preset, then to a bare start date.
  const phrase = stayPresetPhrase(preset);
  if (phrase) return `${poss} with you ${phrase}.`;
  if (start) return `${poss} with you from ${fmt(start)}.`;
  return null;
}

function stayPresetPhrase(preset?: string | null): string | null {
  switch (preset) {
    case "hours": return "for a few hours";
    case "overnight": return "overnight";
    case "days": return "for a few days";
    case "longer": return "for a little while";
    default: return null;
  }
}

/** Normalise `feeding.treats` (#24) — historically a single {type, limit}
 * object, now optionally an array. Returns only entries with content. */
export function treatEntries(treats: unknown): { type: string; limit: string }[] {
  const list = Array.isArray(treats) ? treats : treats ? [treats] : [];
  return list
    .map((t: any) => ({ type: (t?.type ?? "").trim(), limit: (t?.limit ?? "").trim() }))
    .filter((t) => t.type || t.limit);
}

/** Starter commands for quick-add chips (#18). Reward is deliberately absent —
 * genuinely pet-specific, never pre-guessed. Recall's meaning intentionally
 * flags reliability as a safety consideration, not just a definition (#22). */
export const SUGGESTED_COMMANDS: { word: string; meaning: string }[] = [
  { word: "Sit", meaning: "Bottom on the ground, stays until released" },
  { word: "Stay", meaning: "Holds position until released" },
  { word: "Down", meaning: "Lies down, stays until released" },
  { word: "Come", meaning: "Comes back when called — if not 100% reliable, keep on lead around other dogs/roads" },
  { word: "Wait", meaning: "Pauses briefly (doors, curbs) before continuing" },
  { word: "Leave it", meaning: "Disengages from/ignores something on command" },
  { word: "Drop it", meaning: "Releases whatever's in their mouth" },
  { word: "Off", meaning: "Gets down/away from furniture, people, or counters" },
  { word: "Heel", meaning: "Walks close beside without pulling" },
  { word: "Settle", meaning: "Calms down and relaxes in place" },
];

/** Google's formatted_address carries a postcode and a country that cost a line
 * wrap on a phone without telling a sitter anything they'd act on. Street and
 * suburb are the part that disambiguates one branch of a chain from another —
 * "Greencross Vets" alone doesn't — so that's what's kept.
 *
 * Display only: the Maps link still queries the full stored address, so
 * nothing about accuracy changes. Lives here rather than in either app so the
 * recipient page and the in-app preview can't drift apart. */
export function shortAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  // A trailing country never carries digits, and only ever appears last.
  if (parts.length > 1 && !/\d/.test(parts[parts.length - 1])) parts.pop();
  const last = parts[parts.length - 1];
  if (!last) return parts.join(", ");
  if (parts.length > 1 && /^[A-Z]{2,3}\s+\d{3,10}$/.test(last)) {
    // A segment that is only state + postcode ("IL 62704") — drop the lot.
    parts.pop();
  } else {
    // "Macquarie Park NSW 2113" → "Macquarie Park", and the NZ shape with no
    // state code, "Auckland 1011" → "Auckland". Only ever applied to the final
    // segment, which is the locality rather than the street, so a numbered
    // road is never at risk. Anything that doesn't match (UK postcodes, say)
    // is left exactly as Google gave it.
    const trimmed = last
      .replace(/\s+[A-Z]{2,3}\s+\d{3,10}$/, "")
      .replace(/\s+\d{4,5}$/, "")
      .trim();
    parts[parts.length - 1] = parts.length > 1 && trimmed ? trimmed : last;
  }
  return parts.join(", ");
}

/** The one question every paywall check asks: is this owner unlocked?
 *
 * Every surface — mobile screens, the SSR recipient page, edge functions —
 * must go through this rather than reading purchase_status inline. The reason
 * is the annual plan: a subscription can lapse, so "paid" is no longer a
 * boolean fact about the row, it's purchase_status plus whether expires_at
 * (null for the lifetime unlock, a real date for subscriptions) is still in
 * the future. Nine scattered inline checks each remembering that rule is how
 * a lapsed subscriber keeps paid access on the one surface somebody forgot.
 *
 * Callers must select expires_at alongside purchase_status. */
export function isUnlocked(
  owner: { purchase_status?: string | null; expires_at?: string | null } | null | undefined
): boolean {
  if (!owner || owner.purchase_status !== "paid") return false;
  if (!owner.expires_at) return true; // lifetime, or a grant with no end
  const t = new Date(owner.expires_at).getTime();
  return isNaN(t) ? false : t > Date.now();
}

/** Which required policies this owner has *not* accepted at the current version.
 *
 * The gate used to read `owners.terms_policy_version` against a single
 * `CONSENT_POLICY_VERSION`, which made the two policies move as one: bumping
 * the Privacy Policy alone couldn't re-prompt anybody, because the column it
 * compared against never changed. `policy_acceptances` already records one row
 * per policy per version, so the gate reads that instead and each policy
 * versions independently.
 *
 * Returns the policy types still owed, in a stable order, so the caller can
 * both decide whether to route to /accept-terms and record *why*. Empty means
 * fully consented.
 *
 * Only the row set matters, not its ordering or how many historical rows there
 * are — an owner who accepted v1, then v2, then v1 again still counts as
 * current for v2. */
export function missingPolicyAcceptances(
  rows: Array<{ policy_type?: string | null; version?: string | null }> | null | undefined,
  versions: { privacy_policy: string; terms_of_service: string }
): string[] {
  const accepted = new Set(
    (rows ?? [])
      .filter((r) => r && r.policy_type && r.version)
      .map((r) => `${r.policy_type}@${r.version}`)
  );
  return (Object.keys(versions) as Array<keyof typeof versions>)
    .filter((type) => !accepted.has(`${type}@${versions[type]}`))
    .sort();
}

/** True when the owner must be routed to /accept-terms. */
export function needsPolicyAcceptance(
  rows: Array<{ policy_type?: string | null; version?: string | null }> | null | undefined,
  versions: { privacy_policy: string; terms_of_service: string }
): boolean {
  return missingPolicyAcceptances(rows, versions).length > 0;
}

/** How an acceptance came about, for the `method` column.
 *
 * `signup` is only honest the first time. Anyone who already has acceptance
 * rows and is back at the gate is there because a version was bumped — that's
 * a re-consent, and recording it as `signup` would make the audit trail claim
 * every owner signed up repeatedly. */
export function acceptanceMethod(
  rows: Array<{ policy_type?: string | null; version?: string | null }> | null | undefined
): "signup" | "re_consent" {
  return (rows ?? []).length > 0 ? "re_consent" : "signup";
}

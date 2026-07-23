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

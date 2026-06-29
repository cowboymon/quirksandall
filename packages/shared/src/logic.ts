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

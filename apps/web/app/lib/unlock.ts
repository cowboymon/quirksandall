import { createHmac, timingSafeEqual } from "crypto";

// Persisted PIN unlock (#87). When a recipient enters the correct PIN we hand
// their device a signed, httpOnly cookie so the emergency block stays unlocked
// for 30 days without re-entry. The cookie only *proves the PIN was entered* —
// the actual contacts are still fetched server-side on every visit, and the
// link's revoked/pin state is always re-checked, so a revoked link or a changed
// PIN re-locks immediately.

export const UNLOCK_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// One cookie per link so a device can hold unlocks for several links at once,
// and clearing one never affects another.
export function unlockCookieName(token: string): string {
  return `qa_unlock_${token}`;
}

function secret(): string {
  // A dedicated secret is preferred, but the service key is an equally strong
  // server-only secret, so fall back to it rather than require new config.
  const s = process.env.PIN_UNLOCK_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (!s) throw new Error("No unlock signing secret configured");
  return s;
}

// The signature binds the token, the link's *current* PIN hash and the expiry.
// Binding the PIN hash means the owner changing the PIN invalidates every
// outstanding unlock for free.
function sign(token: string, pinHash: string, exp: number): string {
  return createHmac("sha256", secret()).update(`${token}.${pinHash}.${exp}`).digest("hex");
}

// Build the cookie value proving this device entered the correct PIN.
export function signUnlock(token: string, pinHash: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + UNLOCK_MAX_AGE_SECONDS;
  return `${exp}.${sign(token, pinHash, exp)}`;
}

// Verify a cookie value against the link's current PIN hash. A missing cookie,
// a passed 30-day expiry, or a PIN change (different hash) all return false.
export function verifyUnlock(token: string, pinHash: string, value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(value.slice(0, dot));
  const sig = value.slice(dot + 1);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = sign(token, pinHash, exp);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

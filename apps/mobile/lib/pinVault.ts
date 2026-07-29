// Device-local memory of the PIN the owner chose, so the app can offer to send
// it to a sitter without ever being able to look it up server-side.
//
// The PIN is bcrypt-hashed in the database on purpose (see set-pin) — it must
// stay unrecoverable there. This stores the owner's own PIN in the device
// keychain (Keychain on iOS, Keystore on Android), encrypted by the OS, never
// synced to us. Same trust model as a password manager: it's their secret, on
// their hardware.
//
// Treat a miss as normal, not an error — a reinstall or a second device simply
// won't have it, and the share flow falls back to asking the owner to type it.
import * as SecureStore from "expo-secure-store";

// Keyed per pet: the PIN gates a pet's emergency block, and PINEditor sets it
// per pet rather than per link.
const key = (petId: string) => `pin_${petId}`;

export async function rememberPin(petId: string, pin: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(petId), pin);
  } catch {
    // Non-fatal: the PIN is already saved server-side. Losing the local copy
    // only means the owner types it when sending, which is the fallback path.
  }
}

export async function recallPin(petId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key(petId));
  } catch {
    return null;
  }
}

export async function forgetPin(petId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key(petId));
  } catch {
    /* nothing to clean up */
  }
}

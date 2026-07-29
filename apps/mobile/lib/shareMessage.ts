// Copy for the messages an owner sends a sitter. Kept together so the wording
// can be reviewed in one place rather than hunted across the share flow.
import { possessive } from "@quirksandall/shared";

/** First send of a link — explains what the thing is before the sitter taps a
 * bare URL from someone. The PIN line only appears when a PIN actually gates
 * the emergency block, and promises the PIN separately rather than including
 * it: sending both in one message is what would make the PIN pointless. */
export function firstShareMessage(petName: string, url: string, pinSet: boolean): string {
  const name = petName.trim() || "my pet";
  const intro =
    `Here's everything you need for ${name} — feeding, routine, vet details, the lot. ` +
    `It's a link, nothing to download.`;
  const pinNote = pinSet
    ? `\n\nI'll send the PIN separately, you'll need it for the emergency contacts.`
    : "";
  // The URL sits inside the message rather than being passed as a separate
  // `url` — iOS renders both and the link shows up twice (#41). Trade-off
  // accepted: explanatory text is worth more than a rich preview card on the
  // one send where the sitter doesn't yet know what they've been handed.
  return `${intro}\n\n${url}${pinNote}`;
}

/** The PIN, sent on its own. Deliberately a separate message — a PIN that
 * travels beside the link it guards protects nothing. */
export function pinMessage(petName: string, pin: string): string {
  const name = petName.trim();
  return name ? `PIN for ${possessive(name)} link: ${pin}` : `PIN for the link: ${pin}`;
}

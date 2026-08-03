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
  // The URL goes inside the message rather than being passed as a separate
  // `url` — iOS renders both and the link shows up twice (#41).
  //
  // It goes LAST, on its own line, deliberately: messaging apps generate the
  // rich preview card from a trailing URL, and burying it mid-message is what
  // suppressed the preview. Same words, same order of ideas — read the intro,
  // learn a PIN is coming, then get the link.
  return `${intro}${pinNote}\n\n${url}`;
}

/** The PIN, sent on its own. Deliberately a separate message — a PIN that
 * travels beside the link it guards protects nothing.
 *
 * Worded for SEARCH, not just for reading: a sitter digs this out of their
 * messages days later, mid-errand, and "PIN for the link" matches nothing
 * memorable. Pet name + brand name give them two distinctive things to type
 * into search ("Olive", "Quirks") and make the message self-explanatory
 * out of context. */
export function pinMessage(petName: string, pin: string): string {
  const name = petName.trim();
  return name
    ? `${possessive(name)} Quirks & All PIN: ${pin}`
    : `Quirks & All PIN: ${pin}`;
}

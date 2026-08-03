// Pure authorization-decision helper shared by set-pin and rotate-link — no
// Deno-specific imports, so this is also importable from a Node/Vitest test
// runner to unit test the decision logic directly, independent of any live
// database.
//
// The core property under test: "link/pet doesn't exist" and "link/pet
// exists but belongs to a different owner" must produce the IDENTICAL
// caller-visible outcome (both denied, same shape). Splitting them into
// different responses (404 vs 403) lets an authenticated caller use the
// split itself as an oracle to enumerate valid resource ids belonging to
// other accounts — low severity here since ids are random UUIDs, but a real
// information leak in principle, and cheap to close.

export function isOwnedPet(pet: { owner_id: string } | null | undefined, callerId: string): boolean {
  return !!pet && !!callerId && pet.owner_id === callerId;
}

// share_links doesn't carry an owner_id of its own — ownership is via the
// pet it points at. A link that doesn't exist, or whose pet doesn't exist,
// or whose pet belongs to someone else, are all "not authorized" — never
// differentiate between these cases in the response.
export function isAuthorizedForLink(
  link: { pet_id: string } | null | undefined,
  pet: { owner_id: string } | null | undefined,
  callerId: string,
): boolean {
  if (!link) return false;
  return isOwnedPet(pet, callerId);
}

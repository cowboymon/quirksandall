import { describe, it, expect } from "vitest";
import { isOwnedPet, isAuthorizedForLink } from "./authz";

const OWNER = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("isOwnedPet", () => {
  it("allows the actual owner", () => {
    expect(isOwnedPet({ owner_id: OWNER }, OWNER)).toBe(true);
  });

  it("denies a pet owned by someone else — the core cross-user-access threat", () => {
    expect(isOwnedPet({ owner_id: OTHER }, OWNER)).toBe(false);
  });

  it("denies a nonexistent pet (null/undefined row)", () => {
    expect(isOwnedPet(null, OWNER)).toBe(false);
    expect(isOwnedPet(undefined, OWNER)).toBe(false);
  });

  it("denies when the caller id is empty", () => {
    expect(isOwnedPet({ owner_id: OWNER }, "")).toBe(false);
  });
});

describe("isAuthorizedForLink", () => {
  const link = { pet_id: "pet-1" };

  it("allows when the link exists and its pet belongs to the caller", () => {
    expect(isAuthorizedForLink(link, { owner_id: OWNER }, OWNER)).toBe(true);
  });

  it("denies when the link exists but its pet belongs to someone else", () => {
    expect(isAuthorizedForLink(link, { owner_id: OTHER }, OWNER)).toBe(false);
  });

  it("denies when the link doesn't exist at all", () => {
    expect(isAuthorizedForLink(null, { owner_id: OWNER }, OWNER)).toBe(false);
    expect(isAuthorizedForLink(undefined, null, OWNER)).toBe(false);
  });

  it("denies when the link's pet doesn't exist (orphaned link)", () => {
    expect(isAuthorizedForLink(link, null, OWNER)).toBe(false);
  });

  it("produces the SAME boolean outcome for 'not found' and 'found but foreign' — this is the property that closes the enumeration oracle", () => {
    const notFound = isAuthorizedForLink(null, null, OWNER);
    const foundButForeign = isAuthorizedForLink(link, { owner_id: OTHER }, OWNER);
    expect(notFound).toBe(foundButForeign);
    expect(notFound).toBe(false);
  });
});

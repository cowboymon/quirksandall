import { describe, it, expect } from "vitest";
import {
  acceptanceMethod,
  dateFieldError,
  missingPolicyAcceptances,
  needsPolicyAcceptance,
  stayPhrase,
  stayStatus,
  treatEntries,
} from "./logic";

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe("stayPhrase (compact, owner dashboard)", () => {
  const dd = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  it("renders presets when no dates are set", () => {
    expect(stayPhrase("hours", null)).toBe("for a few hours");
    expect(stayPhrase("overnight", null)).toBe("overnight");
    expect(stayPhrase(null, null)).toBeNull();
  });

  it("renders a future end date as bare DD/MM", () => {
    const end = daysFromNow(3);
    expect(stayPhrase(null, end)).toBe(`until ${dd(end)}`);
  });

  it("renders a future start and end as a DD/MM range", () => {
    const start = daysFromNow(2);
    const end = daysFromNow(5);
    expect(stayPhrase(null, end, start)).toBe(`${dd(start)} – ${dd(end)}`);
  });

  it("composes a future start with a preset", () => {
    const start = daysFromNow(2);
    expect(stayPhrase("days", null, start)).toBe(`for a few days from ${dd(start)}`);
  });

  it("renders a bare future start with no preset", () => {
    const start = daysFromNow(2);
    expect(stayPhrase(null, null, start)).toBe(`from ${dd(start)}`);
  });

  it("drops a start that has already arrived", () => {
    const end = daysFromNow(3);
    expect(stayPhrase(null, end, daysFromNow(-1))).toBe(`until ${dd(end)}`);
    expect(stayPhrase("days", null, new Date().toISOString())).toBe("for a few days");
  });

  it("end date still applies on its own day", () => {
    const today = new Date().toISOString();
    expect(stayPhrase(null, today)).toBe(`until ${dd(today)}`);
  });

  it("renders nothing once the stay has ended, preset included", () => {
    expect(stayPhrase(null, daysFromNow(-2))).toBeNull();
    expect(stayPhrase("days", daysFromNow(-2))).toBeNull();
    expect(stayPhrase(null, daysFromNow(-1), daysFromNow(2))).toBeNull();
  });
});

describe("treatEntries", () => {
  it("normalises the legacy single object", () => {
    expect(treatEntries({ type: "Chicken jerky", limit: "Max 3" })).toEqual([
      { type: "Chicken jerky", limit: "Max 3" },
    ]);
  });

  it("passes arrays through, dropping empty entries", () => {
    expect(
      treatEntries([
        { type: "Chicken jerky", limit: "Max 3" },
        { type: "", limit: "" },
        { type: "Dental chew", limit: "" },
      ])
    ).toEqual([
      { type: "Chicken jerky", limit: "Max 3" },
      { type: "Dental chew", limit: "" },
    ]);
  });

  it("handles null/undefined/malformed", () => {
    expect(treatEntries(null)).toEqual([]);
    expect(treatEntries(undefined)).toEqual([]);
    expect(treatEntries({})).toEqual([]);
    expect(treatEntries([{}])).toEqual([]);
  });
});

describe("stayStatus (#20 — sitter-facing phases)", () => {
  const AT = (iso: string) => new Date(`${iso}T09:00:00`);
  const NOW = AT("2026-08-10");
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  it("counts down before the stay starts", () => {
    expect(stayStatus("Olive", null, "2026-08-16", "2026-08-13", NOW)).toBe(
      `3 days until Olive is with you — ${fmt("2026-08-13")} to ${fmt("2026-08-16")}.`
    );
  });

  it("says tomorrow rather than '1 days'", () => {
    expect(stayStatus("Olive", null, "2026-08-16", "2026-08-11", NOW)).toBe(
      `Olive is with you from tomorrow until ${fmt("2026-08-16")}.`
    );
  });

  it("counts down with no end date", () => {
    expect(stayStatus("Olive", null, null, "2026-08-14", NOW)).toBe(
      `4 days until Olive is with you — from ${fmt("2026-08-14")}.`
    );
  });

  it("shows the full range once under way", () => {
    expect(stayStatus("Olive", null, "2026-08-20", "2026-08-08", NOW)).toBe(
      `Olive's with you from ${fmt("2026-08-08")} to ${fmt("2026-08-20")}.`
    );
  });

  it("switches to a countdown near the end", () => {
    expect(stayStatus("Olive", null, "2026-08-12", "2026-08-08", NOW)).toBe(
      `Olive's with you for another 2 days — until ${fmt("2026-08-12")}.`
    );
  });

  it("handles the last day and the day before it", () => {
    expect(stayStatus("Olive", null, "2026-08-11", null, NOW)).toBe(
      `Olive's with you for one more day — until ${fmt("2026-08-11")}.`
    );
    expect(stayStatus("Olive", null, "2026-08-10", null, NOW)).toBe(
      "Olive's with you until the end of today."
    );
  });

  it("states plainly when the stay is over", () => {
    expect(stayStatus("Olive", "days", "2026-08-09", "2026-08-01", NOW)).toBe(
      "Olive is no longer staying with you."
    );
  });

  it("a start that has arrived reads as under way, not as a countdown", () => {
    expect(stayStatus("Olive", null, "2026-08-20", "2026-08-10", NOW)).toBe(
      `Olive's with you from ${fmt("2026-08-10")} to ${fmt("2026-08-20")}.`
    );
  });

  it("falls back to the preset when there's no end date", () => {
    expect(stayStatus("Olive", "days", null, null, NOW)).toBe("Olive's with you for a few days.");
    expect(stayStatus("Olive", "overnight", null, null, NOW)).toBe("Olive's with you overnight.");
  });

  it("returns null when the owner set nothing", () => {
    expect(stayStatus("Olive", null, null, null, NOW)).toBeNull();
  });

  it("possessives a name ending in s, and copes with a blank name", () => {
    expect(stayStatus("Gus", "overnight", null, null, NOW)).toBe("Gus' with you overnight.");
    expect(stayStatus("", "overnight", null, null, NOW)).toBe("Your pet's with you overnight.");
  });
});

describe("dateFieldError", () => {
  const dmy = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  it("stays quiet while the date is still being entered", () => {
    expect(dateFieldError("", "future")).toBeNull();
    expect(dateFieldError("12/0", "future")).toBeNull();
    expect(dateFieldError(null, "future")).toBeNull();
  });

  it("rejects a date that doesn't exist", () => {
    expect(dateFieldError("31/02/2027", "future")).toBe("That date doesn't exist — check the day and month");
  });

  it("enforces the range direction", () => {
    expect(dateFieldError(dmy(5), "birthday")).toBe("That's in the future");
    expect(dateFieldError(dmy(5), "past")).toBe("That's in the future");
    expect(dateFieldError(dmy(-5), "future")).toBe("That date has already passed");
  });

  it("accepts today for every range", () => {
    expect(dateFieldError(dmy(0), "future")).toBeNull();
    expect(dateFieldError(dmy(0), "past")).toBeNull();
    expect(dateFieldError(dmy(0), "birthday")).toBeNull();
  });

  it("enforces notBefore — an end date can't precede its start", () => {
    expect(dateFieldError(dmy(3), "future", dmy(5))).toBe("Can't be before the start date");
    expect(dateFieldError(dmy(5), "future", dmy(3))).toBeNull();
    expect(dateFieldError(dmy(3), "future", dmy(3))).toBeNull(); // same day is fine
  });

  it("ignores an absent or half-typed notBefore", () => {
    expect(dateFieldError(dmy(3), "future", "")).toBeNull();
    expect(dateFieldError(dmy(3), "future", "12/0")).toBeNull();
  });
});

describe("policy acceptance gate", () => {
  const V = { privacy_policy: "1.0", terms_of_service: "1.0" };

  it("owes both policies when there are no rows at all", () => {
    expect(missingPolicyAcceptances([], V)).toEqual(["privacy_policy", "terms_of_service"]);
    expect(missingPolicyAcceptances(null, V)).toEqual(["privacy_policy", "terms_of_service"]);
    expect(needsPolicyAcceptance(undefined, V)).toBe(true);
  });

  it("is satisfied when both current versions are present", () => {
    const rows = [
      { policy_type: "privacy_policy", version: "1.0" },
      { policy_type: "terms_of_service", version: "1.0" },
    ];
    expect(missingPolicyAcceptances(rows, V)).toEqual([]);
    expect(needsPolicyAcceptance(rows, V)).toBe(false);
  });

  it("re-prompts for one policy when only that one is bumped", () => {
    const rows = [
      { policy_type: "privacy_policy", version: "1.0" },
      { policy_type: "terms_of_service", version: "1.0" },
    ];
    expect(missingPolicyAcceptances(rows, { privacy_policy: "2.0", terms_of_service: "1.0" }))
      .toEqual(["privacy_policy"]);
    expect(missingPolicyAcceptances(rows, { privacy_policy: "1.0", terms_of_service: "2.0" }))
      .toEqual(["terms_of_service"]);
  });

  it("counts an older acceptance as still owing", () => {
    const rows = [{ policy_type: "privacy_policy", version: "0.9" }];
    expect(needsPolicyAcceptance(rows, V)).toBe(true);
  });

  it("accepts history in any order and ignores junk rows", () => {
    const rows = [
      { policy_type: "terms_of_service", version: "0.9" },
      { policy_type: "privacy_policy", version: "1.0" },
      { policy_type: null, version: "1.0" },
      { policy_type: "terms_of_service", version: null },
      { policy_type: "terms_of_service", version: "1.0" },
      { policy_type: "privacy_policy", version: "0.9" },
    ];
    expect(missingPolicyAcceptances(rows, V)).toEqual([]);
  });

  it("labels the first acceptance signup and later ones re_consent", () => {
    expect(acceptanceMethod([])).toBe("signup");
    expect(acceptanceMethod(null)).toBe("signup");
    expect(acceptanceMethod([{ policy_type: "privacy_policy", version: "0.9" }])).toBe("re_consent");
  });
});

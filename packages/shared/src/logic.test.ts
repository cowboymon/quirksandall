import { describe, it, expect } from "vitest";
import { stayPhrase, treatEntries } from "./logic";

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

describe("stayPhrase", () => {
  it("renders presets when nothing else is set", () => {
    expect(stayPhrase("hours", null)).toBe("for a few hours");
    expect(stayPhrase("overnight", null)).toBe("overnight");
    expect(stayPhrase(null, null)).toBeNull();
  });

  it("renders a future end date and refuses a stale one", () => {
    const end = daysFromNow(3);
    expect(stayPhrase(null, end)).toBe(`until ${fmt(end)}`);
    expect(stayPhrase(null, daysFromNow(-2))).toBeNull();
    // Preset must not resurface behind an expired date — equally stale.
    expect(stayPhrase("days", daysFromNow(-2))).toBeNull();
  });

  it("end date still applies on its own day", () => {
    const today = new Date().toISOString();
    expect(stayPhrase(null, today)).toBe(`until ${fmt(today)}`);
  });

  describe("start date (#20)", () => {
    it("future start alone renders 'from …'", () => {
      const start = daysFromNow(2);
      expect(stayPhrase(null, null, start)).toBe(`from ${fmt(start)}`);
    });

    it("future start + end renders the full range", () => {
      const start = daysFromNow(2);
      const end = daysFromNow(5);
      expect(stayPhrase(null, end, start)).toBe(`from ${fmt(start)} until ${fmt(end)}`);
    });

    it("future start composes with a preset", () => {
      const start = daysFromNow(2);
      expect(stayPhrase("days", null, start)).toBe(`for a few days from ${fmt(start)}`);
    });

    it("a start that has arrived collapses to the plain form", () => {
      const end = daysFromNow(3);
      // Started yesterday: reads as a normal in-progress stay.
      expect(stayPhrase(null, end, daysFromNow(-1))).toBe(`until ${fmt(end)}`);
      // Starts today: the stay has begun today, same collapse.
      expect(stayPhrase("days", null, new Date().toISOString())).toBe("for a few days");
    });

    it("null start means already-with-you (no change from before)", () => {
      const end = daysFromNow(3);
      expect(stayPhrase(null, end, null)).toBe(`until ${fmt(end)}`);
    });

    it("fully stale range renders nothing", () => {
      expect(stayPhrase(null, daysFromNow(-1), daysFromNow(2))).toBeNull();
    });
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

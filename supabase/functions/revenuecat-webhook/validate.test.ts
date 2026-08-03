import { describe, it, expect } from "vitest";
import { safeEqual, isAnonymousAppUserId, isValidAppUserId, parseTimestampMs, isValidEventShape } from "./validate";

describe("safeEqual", () => {
  it("matches equal strings", () => {
    expect(safeEqual("Bearer secret123", "Bearer secret123")).toBe(true);
  });

  it("rejects differing strings, including a same-length near-miss", () => {
    expect(safeEqual("Bearer secret123", "Bearer secret124")).toBe(false);
    expect(safeEqual("Bearer secret123", "Bearer wrongsecr")).toBe(false);
  });

  it("rejects differing lengths without throwing", () => {
    expect(safeEqual("short", "a much longer string")).toBe(false);
    expect(safeEqual("", "nonempty")).toBe(false);
  });
});

describe("isAnonymousAppUserId / isValidAppUserId", () => {
  it("recognizes a RevenueCat anonymous id", () => {
    expect(isAnonymousAppUserId("$RCAnonymousID:abc123")).toBe(true);
  });

  it("accepts a well-formed Supabase auth uuid", () => {
    expect(isValidAppUserId("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
  });

  it("rejects a non-uuid app_user_id, even if superficially id-shaped", () => {
    expect(isValidAppUserId("not-a-uuid")).toBe(false);
    expect(isValidAppUserId("12345")).toBe(false);
    expect(isValidAppUserId("")).toBe(false);
  });

  it("rejects a SQL/command-injection-shaped app_user_id", () => {
    expect(isValidAppUserId("'; drop table owners; --")).toBe(false);
    expect(isValidAppUserId("$(rm -rf /)")).toBe(false);
    expect(isValidAppUserId("../../etc/passwd")).toBe(false);
  });

  it("rejects a non-string app_user_id", () => {
    expect(isValidAppUserId(null)).toBe(false);
    expect(isValidAppUserId(undefined)).toBe(false);
    expect(isValidAppUserId(12345)).toBe(false);
    expect(isValidAppUserId({})).toBe(false);
  });
});

describe("parseTimestampMs", () => {
  it("accepts a normal epoch-ms timestamp", () => {
    expect(parseTimestampMs(1735689600000)).toBe(1735689600000);
  });

  it("rejects non-numeric input", () => {
    expect(parseTimestampMs("1735689600000")).toBeNull();
    expect(parseTimestampMs("not a number")).toBeNull();
    expect(parseTimestampMs(null)).toBeNull();
    expect(parseTimestampMs(undefined)).toBeNull();
    expect(parseTimestampMs({})).toBeNull();
  });

  it("rejects NaN/Infinity", () => {
    expect(parseTimestampMs(NaN)).toBeNull();
    expect(parseTimestampMs(Infinity)).toBeNull();
    expect(parseTimestampMs(-Infinity)).toBeNull();
  });

  it("rejects out-of-sane-range values", () => {
    expect(parseTimestampMs(-1)).toBeNull();
    expect(parseTimestampMs(9999999999999999)).toBeNull();
  });
});

describe("isValidEventShape", () => {
  it("accepts a well-formed event object", () => {
    expect(isValidEventShape({ type: "INITIAL_PURCHASE", app_user_id: "abc" })).toBe(true);
  });

  it("rejects a missing/non-string type", () => {
    expect(isValidEventShape({})).toBe(false);
    expect(isValidEventShape({ type: 123 })).toBe(false);
    expect(isValidEventShape({ type: null })).toBe(false);
  });

  it("rejects non-object payloads, including arrays and primitives", () => {
    expect(isValidEventShape(null)).toBe(false);
    expect(isValidEventShape(undefined)).toBe(false);
    expect(isValidEventShape("INITIAL_PURCHASE")).toBe(false);
    expect(isValidEventShape(["INITIAL_PURCHASE"])).toBe(false);
    expect(isValidEventShape(42)).toBe(false);
  });
});

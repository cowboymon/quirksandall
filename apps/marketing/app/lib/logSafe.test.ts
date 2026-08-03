import { describe, it, expect, vi, afterEach } from "vitest";
import { logSupabaseError } from "./logSafe";

describe("logSupabaseError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only code and message, never details/hint that could carry submitted PII", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (email)=(someone@example.com) already exists.",
      hint: "some hint text",
    };
    logSupabaseError("waitlist insert failed", error);
    expect(spy).toHaveBeenCalledTimes(1);
    const [label, logged] = spy.mock.calls[0];
    expect(label).toBe("waitlist insert failed");
    expect(logged).toEqual({ code: "23505", message: "duplicate key value violates unique constraint" });
    expect(JSON.stringify(logged)).not.toContain("someone@example.com");
  });

  it("handles a null/undefined error without throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => logSupabaseError("x failed", null)).not.toThrow();
    expect(() => logSupabaseError("x failed", undefined)).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

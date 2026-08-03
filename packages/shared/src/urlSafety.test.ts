import { describe, it, expect } from "vitest";
import { isSafeHttpsUrl, sanitizeTelValue } from "./urlSafety";

describe("isSafeHttpsUrl", () => {
  it("accepts a well-formed https URL", () => {
    expect(isSafeHttpsUrl("https://example.com/photo.jpg")).toBe(true);
    expect(isSafeHttpsUrl("https://bktxnovrkiilkfvzlwwo.supabase.co/storage/v1/x.png")).toBe(true);
  });

  it("rejects javascript: URLs — the core XSS-via-href/src threat this guards against", () => {
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(document.cookie)")).toBe(false);
    expect(isSafeHttpsUrl("Javascript:alert(1)")).toBe(false); // case variation
    expect(isSafeHttpsUrl("  javascript:alert(1)")).toBe(false); // leading whitespace trick
  });

  it("rejects data: URLs (can carry an executable HTML/SVG payload)", () => {
    expect(isSafeHttpsUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpsUrl("data:image/svg+xml;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(false);
  });

  it("rejects other dangerous/unexpected schemes", () => {
    expect(isSafeHttpsUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHttpsUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpsUrl("ftp://example.com/x")).toBe(false);
    expect(isSafeHttpsUrl("http://example.com")).toBe(false); // http, not https
  });

  it("rejects a scheme-relative or malformed value", () => {
    expect(isSafeHttpsUrl("//evil.com/x")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
    expect(isSafeHttpsUrl("")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isSafeHttpsUrl(null)).toBe(false);
    expect(isSafeHttpsUrl(undefined)).toBe(false);
    expect(isSafeHttpsUrl(42)).toBe(false);
    expect(isSafeHttpsUrl({})).toBe(false);
  });
});

describe("sanitizeTelValue", () => {
  it("passes through a normal phone number", () => {
    expect(sanitizeTelValue("+61 400 123 456")).toBe("+61 400 123 456");
    expect(sanitizeTelValue("(02) 9123 4567")).toBe("(02) 9123 4567");
  });

  it("strips anything that isn't a digit/+/-/()/space (including letters) — the core defense against smuggling markup through a tel: href", () => {
    // Only digits/+/-/()/space survive — letters, quotes, angle brackets,
    // and every other markup/script-breakout character are stripped too.
    expect(sanitizeTelValue('123"onmouseover="alert(1)')).toBe("123(1)");
    expect(sanitizeTelValue("123<script>alert(1)</script>")).toBe("123(1)");
    expect(sanitizeTelValue("123;javascript:alert(1)")).toBe("123(1)");
    // Confirm the dangerous characters are actually gone, not just that some
    // transformation happened.
    const cleaned = sanitizeTelValue('123"onmouseover="alert(1)');
    expect(cleaned).not.toMatch(/["<>;:a-zA-Z]/);
  });

  it("rejects a value with too few digits to be a real phone number", () => {
    expect(sanitizeTelValue("()--  ")).toBeNull();
    expect(sanitizeTelValue("12")).toBeNull();
    expect(sanitizeTelValue("")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(sanitizeTelValue(null)).toBeNull();
    expect(sanitizeTelValue(undefined)).toBeNull();
    expect(sanitizeTelValue(123456789)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { sanitizeFreeText, isValidImageDataUri, sanitizeHeaderFilenameComponent } from "./inputSanitize";

describe("sanitizeFreeText", () => {
  it("accepts a normal short string", () => {
    expect(sanitizeFreeText("Near the park on Main St", 200)).toBe("Near the park on Main St");
  });

  it("rejects non-string input", () => {
    expect(sanitizeFreeText(123, 200)).toBeNull();
    expect(sanitizeFreeText({ toString: () => "x" }, 200)).toBeNull();
    expect(sanitizeFreeText(["a"], 200)).toBeNull();
    expect(sanitizeFreeText(null, 200)).toBeNull();
    expect(sanitizeFreeText(undefined, 200)).toBeNull();
  });

  it("rejects a string over the length cap", () => {
    expect(sanitizeFreeText("a".repeat(201), 200)).toBeNull();
  });

  it("strips control characters, including CR/LF header-injection attempts", () => {
    expect(sanitizeFreeText("line1\r\nX-Injected: evil", 200)).toBe("line1X-Injected: evil");
    expect(sanitizeFreeText("null\x00byte", 200)).toBe("nullbyte");
  });

  it("rejects empty/whitespace-only input after stripping", () => {
    expect(sanitizeFreeText("   ", 200)).toBeNull();
    expect(sanitizeFreeText("\x00\x00", 200)).toBeNull();
    expect(sanitizeFreeText("", 200)).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeFreeText("  hello  ", 200)).toBe("hello");
  });
});

describe("isValidImageDataUri", () => {
  const SMALL_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  it("accepts a well-formed small image data URI", () => {
    expect(isValidImageDataUri(SMALL_PNG)).toBe(true);
  });

  it("rejects non-string input", () => {
    expect(isValidImageDataUri(42)).toBe(false);
    expect(isValidImageDataUri(null)).toBe(false);
    expect(isValidImageDataUri({})).toBe(false);
  });

  it("rejects a dangerous non-image data scheme", () => {
    expect(isValidImageDataUri("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(false);
    expect(isValidImageDataUri("data:application/javascript;base64,ZXZpbA==")).toBe(false);
  });

  it("rejects a plain non-data URI (path traversal / command-like values)", () => {
    expect(isValidImageDataUri("../../etc/passwd")).toBe(false);
    expect(isValidImageDataUri("file:///etc/passwd")).toBe(false);
    expect(isValidImageDataUri("javascript:alert(1)")).toBe(false);
    expect(isValidImageDataUri("$(rm -rf /)")).toBe(false);
    expect(isValidImageDataUri("`rm -rf /`")).toBe(false);
  });

  it("rejects malformed base64 payloads", () => {
    expect(isValidImageDataUri("data:image/png;base64,not base64!!")).toBe(false);
    expect(isValidImageDataUri("data:image/png;base64,")).toBe(false);
  });

  it("rejects an oversized data URI", () => {
    const huge = "data:image/png;base64," + "A".repeat(11 * 1024 * 1024);
    expect(isValidImageDataUri(huge)).toBe(false);
  });
});

describe("sanitizeHeaderFilenameComponent", () => {
  it("passes through a normal filename component", () => {
    expect(sanitizeHeaderFilenameComponent("olive")).toBe("olive");
  });

  it("strips quotes and backslashes that could break out of a quoted header param", () => {
    expect(sanitizeHeaderFilenameComponent('olive"; evil="x')).toBe("olive; evil=x");
    expect(sanitizeHeaderFilenameComponent("olive\\..\\..\\etc")).toBe("olive....etc");
  });

  it("strips CR/LF to prevent header/response splitting", () => {
    expect(sanitizeHeaderFilenameComponent("olive\r\nSet-Cookie: evil=1")).toBe("oliveSet-Cookie: evil=1");
  });

  it("falls back to a safe default when nothing printable survives", () => {
    expect(sanitizeHeaderFilenameComponent("\r\n\x00", "pet")).toBe("pet");
    expect(sanitizeHeaderFilenameComponent("", "pet")).toBe("pet");
  });
});

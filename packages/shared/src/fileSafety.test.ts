import { describe, it, expect } from "vitest";
import { safeDocumentExtension, safeImageExtension, isSafePathSegment } from "./fileSafety";

describe("safeDocumentExtension", () => {
  it("accepts allowlisted document extensions", () => {
    expect(safeDocumentExtension("vaccination-record.pdf")).toBe("pdf");
    expect(safeDocumentExtension("photo.JPG")).toBe("jpg");
    expect(safeDocumentExtension("scan.docx")).toBe("docx");
  });

  it("rejects a non-allowlisted extension", () => {
    expect(safeDocumentExtension("script.sh")).toBeNull();
    expect(safeDocumentExtension("payload.exe")).toBeNull();
    expect(safeDocumentExtension("archive.zip")).toBeNull();
  });

  it("rejects a filename with no extension", () => {
    expect(safeDocumentExtension("noextension")).toBeNull();
    expect(safeDocumentExtension("trailing.")).toBeNull();
  });

  it("rejects path traversal / embedded separators disguised as an extension", () => {
    expect(safeDocumentExtension("x.foo/bar")).toBeNull();
    expect(safeDocumentExtension("x.../etc/passwd")).toBeNull();
    expect(safeDocumentExtension("x.foo\\bar")).toBeNull();
    expect(safeDocumentExtension("../../etc/passwd.pdf")).toBe("pdf"); // extension itself is still safe
  });

  it("rejects an extension containing command-like or unexpected characters", () => {
    expect(safeDocumentExtension("x.pdf; rm -rf /")).toBeNull();
    expect(safeDocumentExtension("x.$(whoami)")).toBeNull();
    expect(safeDocumentExtension("x.pdf\x00.exe")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(safeDocumentExtension(null as unknown as string)).toBeNull();
    expect(safeDocumentExtension(undefined as unknown as string)).toBeNull();
    expect(safeDocumentExtension(123 as unknown as string)).toBeNull();
  });
});

describe("safeImageExtension", () => {
  it("accepts allowlisted image extensions", () => {
    expect(safeImageExtension("photo.jpg")).toBe("jpg");
    expect(safeImageExtension("photo.png")).toBe("png");
    expect(safeImageExtension("photo.HEIC")).toBe("heic");
  });

  it("rejects a document extension (tighter allowlist than safeDocumentExtension)", () => {
    expect(safeImageExtension("resume.pdf")).toBeNull();
    expect(safeImageExtension("scan.docx")).toBeNull();
  });

  it("rejects path traversal disguised as an extension", () => {
    expect(safeImageExtension("x.jpg/../../etc/passwd")).toBeNull();
  });
});

describe("isSafePathSegment", () => {
  it("accepts a typical uuid/id-shaped segment", () => {
    expect(isSafePathSegment("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isSafePathSegment("user_123")).toBe(true);
  });

  it("rejects a segment containing a path separator (traversal attempt)", () => {
    expect(isSafePathSegment("../../etc/passwd")).toBe(false);
    expect(isSafePathSegment("a/b")).toBe(false);
    expect(isSafePathSegment("a\\b")).toBe(false);
  });

  it("rejects an empty or absurdly long segment", () => {
    expect(isSafePathSegment("")).toBe(false);
    expect(isSafePathSegment("a".repeat(129))).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isSafePathSegment(null)).toBe(false);
    expect(isSafePathSegment(undefined)).toBe(false);
    expect(isSafePathSegment(42)).toBe(false);
    expect(isSafePathSegment({})).toBe(false);
  });
});

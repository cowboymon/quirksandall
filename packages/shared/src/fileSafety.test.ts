import { describe, it, expect } from "vitest";
import {
  safeDocumentExtension,
  safeImageExtension,
  isSafePathSegment,
  contentTypeForExtension,
  matchesFileSignature,
  isValidUploadSize,
  isOwnedStoragePath,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from "./fileSafety";

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

describe("contentTypeForExtension", () => {
  it("returns the fixed content type for each allowlisted extension", () => {
    expect(contentTypeForExtension("pdf")).toBe("application/pdf");
    expect(contentTypeForExtension("jpg")).toBe("image/jpeg");
    expect(contentTypeForExtension("jpeg")).toBe("image/jpeg");
    expect(contentTypeForExtension("png")).toBe("image/png");
    expect(contentTypeForExtension("docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("never returns an attacker-suppliable value — only ever a fixed map entry or the generic fallback", () => {
    expect(contentTypeForExtension("text/html")).toBe("application/octet-stream");
    expect(contentTypeForExtension("svg")).toBe("application/octet-stream");
    expect(contentTypeForExtension("html")).toBe("application/octet-stream");
    expect(contentTypeForExtension("exe")).toBe("application/octet-stream");
  });

  it("is case-insensitive", () => {
    expect(contentTypeForExtension("PDF")).toBe("application/pdf");
  });
});

describe("matchesFileSignature", () => {
  const bytes = (...vals: number[]) => new Uint8Array(vals);

  it("accepts real JPEG/PNG/PDF/DOCX signatures", () => {
    expect(matchesFileSignature("jpg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(matchesFileSignature("png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(true);
    expect(
      matchesFileSignature("pdf", new Uint8Array([..."%PDF-1.4".split("").map((c) => c.charCodeAt(0))]))
    ).toBe(true);
    expect(matchesFileSignature("docx", bytes(0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0))).toBe(true);
    expect(matchesFileSignature("doc", bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe(true);
  });

  it("accepts a real WEBP (RIFF....WEBP) signature", () => {
    const riffWebp = new Uint8Array(12);
    riffWebp.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    riffWebp.set([0, 0, 0, 0], 4); // size (irrelevant)
    riffWebp.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    expect(matchesFileSignature("webp", riffWebp)).toBe(true);
  });

  it("accepts a real HEIC (ftyp box) signature", () => {
    const heic = new Uint8Array(12);
    heic.set([0, 0, 0, 0x18], 0); // box size (irrelevant)
    heic.set([0x66, 0x74, 0x79, 0x70], 4); // "ftyp"
    expect(matchesFileSignature("heic", heic)).toBe(true);
    expect(matchesFileSignature("heif", heic)).toBe(true);
  });

  it("rejects a renamed executable disguised with an allowlisted extension — the core threat this defends against", () => {
    // MZ header (Windows PE/EXE)
    expect(matchesFileSignature("jpg", bytes(0x4d, 0x5a, 0x90, 0x00))).toBe(false);
    expect(matchesFileSignature("pdf", bytes(0x4d, 0x5a, 0x90, 0x00))).toBe(false);
    // ELF header (Linux executable)
    expect(matchesFileSignature("png", bytes(0x7f, 0x45, 0x4c, 0x46))).toBe(false);
    // Shell script shebang
    const shebang = new Uint8Array("#!/bin/sh\nrm -rf /".split("").map((c) => c.charCodeAt(0)));
    expect(matchesFileSignature("docx", shebang)).toBe(false);
    // HTML disguised as a PDF
    const html = new Uint8Array("<html><script>alert(1)</script>".split("").map((c) => c.charCodeAt(0)));
    expect(matchesFileSignature("pdf", html)).toBe(false);
  });

  it("rejects mismatched signatures across allowlisted types (e.g. a real PNG renamed to .jpg)", () => {
    expect(matchesFileSignature("jpg", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(false);
  });

  it("rejects empty/truncated headers (also covers corrupted files) rather than throwing", () => {
    expect(matchesFileSignature("jpg", new Uint8Array(0))).toBe(false);
    expect(matchesFileSignature("png", bytes(0x89, 0x50))).toBe(false);
    expect(matchesFileSignature("heic", new Uint8Array(2))).toBe(false);
  });

  it("rejects an unrecognized extension outright", () => {
    expect(matchesFileSignature("exe", bytes(0x4d, 0x5a))).toBe(false);
    expect(matchesFileSignature("svg", bytes(0x3c, 0x73, 0x76, 0x67))).toBe(false);
  });
});

describe("isValidUploadSize", () => {
  it("accepts a positive size under the cap", () => {
    expect(isValidUploadSize(1024, MAX_IMAGE_UPLOAD_BYTES)).toBe(true);
    expect(isValidUploadSize(MAX_DOCUMENT_UPLOAD_BYTES, MAX_DOCUMENT_UPLOAD_BYTES)).toBe(true);
  });

  it("rejects a zero-byte (empty) file", () => {
    expect(isValidUploadSize(0, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
  });

  it("rejects a negative size", () => {
    expect(isValidUploadSize(-1, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
  });

  it("rejects an oversized file", () => {
    expect(isValidUploadSize(MAX_IMAGE_UPLOAD_BYTES + 1, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
    expect(isValidUploadSize(500 * 1024 * 1024, MAX_DOCUMENT_UPLOAD_BYTES)).toBe(false);
  });

  it("rejects non-numeric/NaN/Infinity sizes", () => {
    expect(isValidUploadSize("1024" as unknown as number, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
    expect(isValidUploadSize(NaN, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
    expect(isValidUploadSize(Infinity, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
    expect(isValidUploadSize(null, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
    expect(isValidUploadSize(undefined, MAX_IMAGE_UPLOAD_BYTES)).toBe(false);
  });
});

describe("isOwnedStoragePath — private-file cross-user access guard", () => {
  const OWNER = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  const OTHER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("accepts a path genuinely prefixed by the owner's own id", () => {
    expect(isOwnedStoragePath(`${OWNER}/pet123/doc.pdf`, OWNER)).toBe(true);
  });

  it("rejects another user's document — the core cross-user-access threat this guards against", () => {
    expect(isOwnedStoragePath(`${OTHER}/pet123/doc.pdf`, OWNER)).toBe(false);
  });

  it("requires an exact path-segment match, not just a string prefix", () => {
    // A naive `.startsWith(ownerId)` check would wrongly accept this.
    expect(isOwnedStoragePath(`${OWNER}extra-suffix/pet123/doc.pdf`, OWNER)).toBe(false);
  });

  it("rejects a path with no owner segment at all", () => {
    expect(isOwnedStoragePath("doc.pdf", OWNER)).toBe(false);
    expect(isOwnedStoragePath("", OWNER)).toBe(false);
  });

  it("rejects non-string paths and a missing/empty ownerId", () => {
    expect(isOwnedStoragePath(null, OWNER)).toBe(false);
    expect(isOwnedStoragePath(undefined, OWNER)).toBe(false);
    expect(isOwnedStoragePath(42, OWNER)).toBe(false);
    expect(isOwnedStoragePath(`${OWNER}/pet123/doc.pdf`, "")).toBe(false);
  });
});

// Pure helpers for validating a user-supplied filename before it's allowed
// to influence a storage path (Supabase Storage object key, local cache
// path, etc). Shared between apps/mobile (document/photo upload) and any
// server route that needs the same guarantee: never derive a storage-path
// suffix from user input without checking it against a strict allowlist.

// Strict allowlist for uploaded-file extensions. Never derive the allowlist
// from user input; only ever check membership in it.
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  "pdf", "jpg", "jpeg", "png", "heic", "heif", "doc", "docx",
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "heic", "heif", "webp"]);

function normalizeExtension(fileName: string): string | null {
  if (typeof fileName !== "string" || !fileName) return null;
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  // Reject anything that isn't a short run of plain letters/digits — blocks
  // an extension like "foo/bar" or "..%2fetc" from ever reaching a storage
  // path, regardless of what the allowlist below contains.
  if (!/^[a-z0-9]{1,8}$/.test(ext)) return null;
  return ext;
}

// Returns a safe extension for a document upload, or null to reject the
// upload outright. Never returns anything containing a path separator.
export function safeDocumentExtension(fileName: string): string | null {
  const ext = normalizeExtension(fileName);
  if (!ext || !ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) return null;
  return ext;
}

// Same as above, scoped to the tighter image-only allowlist used for pet
// profile photo uploads.
export function safeImageExtension(fileName: string): string | null {
  const ext = normalizeExtension(fileName);
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) return null;
  return ext;
}

// A storage path segment (a user id or pet id used as a path prefix) must
// be a single, non-empty path component with no separators or traversal
// sequences — defense-in-depth on top of these ids normally coming from
// trusted server-side sources (auth.uid(), a DB row), in case a future
// caller ever passes one through less-trusted plumbing.
export function isSafePathSegment(segment: unknown): segment is string {
  return typeof segment === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(segment);
}

// Fixed extension -> Content-Type lookup. Never accept a client-supplied
// mimeType for a stored object's Content-Type — an attacker who controls
// that value can make an allowlisted-by-extension file (e.g. "record.pdf")
// get served back as "text/html" and execute in a browser that opens it.
// This map is the only source of truth for what a file is served as.
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Returns the fixed, safe Content-Type for a validated extension (one that
// already passed safeDocumentExtension/safeImageExtension), or a generic
// binary fallback for anything unrecognized — never a caller-supplied value.
export function contentTypeForExtension(ext: string): string {
  return EXTENSION_CONTENT_TYPES[ext.toLowerCase()] ?? "application/octet-stream";
}

// Magic-number (file-signature) check — validates that the file's actual
// bytes match what its extension claims, so a renamed executable/script
// can't ride through on a trusted-looking filename. Pass at least the first
// 16 bytes of the file. Corrupted/truncated files (too few header bytes, or
// bytes that don't match any known signature) are rejected the same as a
// deliberately disguised file — this function can't tell the two apart, and
// for upload-safety purposes it doesn't need to.
export function matchesFileSignature(ext: string, header: Uint8Array): boolean {
  const b = (i: number) => header[i] ?? -1;
  const normalized = ext.toLowerCase();

  switch (normalized) {
    case "jpg":
    case "jpeg":
      return b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff;
    case "png":
      return (
        b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 &&
        b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a
      );
    case "webp":
      // "RIFF" .... "WEBP"
      return (
        b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
        b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50
      );
    case "heic":
    case "heif":
      // ISO-BMFF container: bytes 4-7 spell "ftyp". Not checking the exact
      // brand (heic/mif1/heix/...) — presence of a valid ftyp box at the
      // right offset is sufficient to confirm this is a real HEIF-family
      // container and not an arbitrary renamed file.
      return b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70;
    case "pdf":
      // "%PDF-"
      return b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46 && b(4) === 0x2d;
    case "doc":
      // OLE compound file (also .xls/.ppt — acceptable, still a real Office
      // binary container, not an arbitrary file).
      return (
        b(0) === 0xd0 && b(1) === 0xcf && b(2) === 0x11 && b(3) === 0xe0 &&
        b(4) === 0xa1 && b(5) === 0xb1 && b(6) === 0x1a && b(7) === 0xe1
      );
    case "docx":
      // ZIP container ("PK\x03\x04" is the common case; \x05\x06 / \x07\x08
      // cover empty/spanned archives).
      return (
        b(0) === 0x50 && b(1) === 0x4b &&
        ((b(2) === 0x03 && b(3) === 0x04) || (b(2) === 0x05 && b(3) === 0x06) || (b(2) === 0x07 && b(3) === 0x08))
      );
    default:
      return false;
  }
}

// Server-enforced size ceilings (also mirrored at the Supabase Storage
// bucket level via file_size_limit — this copy is for the client-side
// pre-upload check, which gives a fast, friendly rejection instead of
// waiting on a network round-trip to find out the bucket rejected it).
export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_DOCUMENT_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

export function isValidUploadSize(sizeBytes: unknown, maxBytes: number): boolean {
  return typeof sizeBytes === "number" && Number.isFinite(sizeBytes) && sizeBytes > 0 && sizeBytes <= maxBytes;
}

// Confirms a storage path is prefixed by the given owner id's own path
// segment ({ownerId}/...) — the convention every owner-scoped bucket in this
// app uses. This is defense-in-depth on top of Storage RLS: a function that
// mints a signed URL for a path should never trust its caller to have
// already scoped that path correctly, even when every current call site
// does. Requires an exact path-segment match (not just a string prefix) —
// "abc" must not match a path under "abc123/...".
export function isOwnedStoragePath(storagePath: unknown, ownerId: string): boolean {
  if (typeof storagePath !== "string" || !storagePath || !ownerId) return false;
  const firstSegment = storagePath.split("/")[0];
  return firstSegment === ownerId;
}

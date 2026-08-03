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

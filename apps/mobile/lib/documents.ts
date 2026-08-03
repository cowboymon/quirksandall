// Document vault (§5.4) — upload/list/remove vaccination & flea-worm records.
// Files live in the PRIVATE "pet-documents" bucket, so they're only ever fetched
// through short-lived signed URLs (never a public link). Mirrors the working
// pet-photo upload pattern (base64 → arraybuffer via the /legacy FS API).
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { decode } from "base64-arraybuffer";
import { safeDocumentExtension, isSafePathSegment } from "@quirksandall/shared";
import { supabase } from "./supabase";
import { randomToken } from "./links";

const BUCKET = "pet-documents";

export type NewDocument = {
  petId: string;
  kind: string; // 'vaccination' | 'flea_worm' | 'other'
  title?: string;
  uri: string; // local file:// URI from the picker
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
};

export async function listDocuments(petId: string) {
  const { data, error } = await supabase
    .from("pet_documents")
    .select("*")
    .eq("pet_id", petId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadDocument(doc: NewDocument) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  // Strict allowlist, not a free split on the last ".": a filename crafted
  // with an embedded "/" (e.g. "x.foo/bar") must never reach the storage
  // path below. petId is similarly constrained to a single safe path
  // segment before it's allowed into the path, as defense-in-depth on top
  // of the storage RLS policy.
  const ext = safeDocumentExtension(doc.fileName);
  if (!ext) throw new Error("That file type isn't supported.");
  if (!isSafePathSegment(doc.petId)) throw new Error("Invalid pet.");

  // {owner}/{pet}/{random}.{ext} — first segment must be the owner uid for the
  // storage RLS policy to allow the write.
  const path = `${user.id}/${doc.petId}/${randomToken()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(doc.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
    contentType: doc.mimeType ?? "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { error: insErr } = await supabase.from("pet_documents").insert({
    pet_id: doc.petId,
    kind: doc.kind,
    title: doc.title || null,
    file_name: doc.fileName,
    storage_path: path,
    mime_type: doc.mimeType ?? null,
    size_bytes: doc.sizeBytes ?? null,
  });
  // If the metadata write fails, roll back the uploaded object so we don't
  // orphan a file with no row pointing at it.
  if (insErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insErr;
  }
}

export async function removeDocument(id: string, storagePath: string) {
  const { error } = await supabase.from("pet_documents").delete().eq("id", id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([storagePath]);
}

// Short-lived signed URL for viewing/downloading a private file.
export async function documentSignedUrl(storagePath: string, expiresIn = 120): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// Hands a document to the OS share sheet as a real attachment (Mail, Messages,
// AirDrop, Files…), rather than sharing a signed URL that expires in two
// minutes and would 404 by the time a vet opened it.
//
// One file per share: neither expo-sharing nor the RN share sheet accepts
// multiple attachments on iOS or Android, so this is per-document by design
// rather than a multi-select.
export async function shareDocument(storagePath: string, fileName: string, mimeType?: string | null): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  const url = await documentSignedUrl(storagePath);
  // Download under the document's real name so the recipient sees
  // "vaccination-record.pdf", not the storage path's opaque id.
  const safeName = fileName.replace(/[^\w.\-]+/g, "_") || "document";
  const target = `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`;
  const { uri } = await FileSystem.downloadAsync(url, target);
  await Sharing.shareAsync(uri, {
    mimeType: mimeType ?? undefined,
    UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
    dialogTitle: fileName,
  });
}

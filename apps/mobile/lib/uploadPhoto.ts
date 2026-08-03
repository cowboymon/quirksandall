// SDK 54 moved readAsStringAsync + EncodingType to the /legacy entry.
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";
import { decode } from "base64-arraybuffer";
import {
  safeImageExtension,
  isSafePathSegment,
  contentTypeForExtension,
  matchesFileSignature,
  isValidUploadSize,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@quirksandall/shared";

/**
 * Upload a local file:// URI to Supabase Storage under owners/{ownerId}/pets/{petId}.
 * Returns the public URL, or throws on failure.
 *
 * Supabase Storage requires the bucket to exist and have a public policy, or
 * use a signed URL. We use a public bucket "pet-photos" here — configure in
 * the Supabase dashboard or via migration.
 *
 * The photo is always re-encoded through ImageManipulator before upload, for
 * three reasons at once: (1) it strips EXIF — a phone photo can embed the
 * exact GPS coordinates it was taken at, and this bucket is public; (2) it
 * forces a real decode of the image, which is a stronger content check than
 * trusting the picker's reported type — a non-image file fails here instead
 * of being uploaded; (3) it normalizes every upload to JPEG, so a HEIC photo
 * (common on iPhone) doesn't end up served from a public URL that many
 * browsers can't render.
 */
export async function uploadPetPhoto(petId: string, localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  if (!isSafePathSegment(petId)) throw new Error("Invalid pet.");

  // Extension is only used to confirm the source looks like an image before
  // we spend effort re-encoding it — the actual stored extension is always
  // "jpg" (see the manipulator step below), regardless of source format.
  if (!safeImageExtension(localUri)) throw new Error("Unsupported photo format.");

  // Re-encode: strips EXIF, forces a real image decode, normalizes to JPEG.
  // Empty actions array + a format conversion is enough to force the
  // manipulator to fully decode and re-emit the image — a non-image file
  // (or a corrupted one) throws here rather than being uploaded verbatim.
  let processed: ImageManipulator.ImageResult;
  try {
    processed = await ImageManipulator.manipulateAsync(localUri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
  } catch {
    throw new Error("That photo couldn't be processed. Try a different one.");
  }

  const ext = "jpg";
  const mimeType = contentTypeForExtension(ext);
  const path = `${user.id}/${petId}.${ext}`;

  const info = await FileSystem.getInfoAsync(processed.uri);
  const size = info.exists ? info.size : 0;
  if (!isValidUploadSize(size, MAX_IMAGE_UPLOAD_BYTES)) {
    throw new Error(size === 0 ? "That photo is empty." : "That photo is too large.");
  }

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(processed.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = new Uint8Array(decode(base64));
  if (bytes.length === 0) throw new Error("That photo is empty.");
  // Belt-and-suspenders: the manipulator only emits JPEG, so this should
  // always match — reject rather than upload if it somehow doesn't.
  if (!matchesFileSignature(ext, bytes)) throw new Error("That photo couldn't be verified. Try a different one.");

  // Upload — upsert so re-saves overwrite the same path
  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, bytes.buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  // Return the public URL with a cache-busting version param. The storage path
  // is stable (we upsert to the same {petId}.{ext}), so without this a replaced
  // photo keeps its old URL — and both RN's Image cache and the CDN would keep
  // serving the previous image. `?v=<timestamp>` makes each save a distinct URL.
  const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

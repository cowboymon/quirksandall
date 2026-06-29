import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";
import { decode } from "base64-arraybuffer";

/**
 * Upload a local file:// URI to Supabase Storage under owners/{ownerId}/pets/{petId}.
 * Returns the public URL, or throws on failure.
 *
 * Supabase Storage requires the bucket to exist and have a public policy, or
 * use a signed URL. We use a public bucket "pet-photos" here — configure in
 * the Supabase dashboard or via migration.
 */
export async function uploadPetPhoto(petId: string, localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  // Determine extension from URI
  const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  const path = `${user.id}/${petId}.${ext}`;

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Upload — upsert so re-saves overwrite the same path
  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, decode(base64), {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  // Return the public URL
  const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
  return data.publicUrl;
}

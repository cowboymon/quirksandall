-- Server-enforced (not just client-side) upload limits. The app already
-- validates size/type before calling Storage, but that's the client asking
-- nicely — these bucket-level settings are what Supabase Storage itself
-- refuses at the API layer, regardless of what any client (present or
-- future) sends.
--
-- pet-photos: the app now always re-encodes to JPEG before upload
-- (apps/mobile/lib/uploadPhoto.ts), so the allowed type list matches that.
update storage.buckets
set file_size_limit = 8388608, -- 8MB, matches MAX_IMAGE_UPLOAD_BYTES in packages/shared/src/fileSafety.ts
    allowed_mime_types = array['image/jpeg']
where id = 'pet-photos';

-- pet-documents: matches ALLOWED_DOCUMENT_EXTENSIONS' content types in
-- packages/shared/src/fileSafety.ts.
update storage.buckets
set file_size_limit = 20971520, -- 20MB, matches MAX_DOCUMENT_UPLOAD_BYTES
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/heic',
      'image/heif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'pet-documents';

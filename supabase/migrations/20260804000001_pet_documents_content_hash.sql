-- Duplicate-upload detection for the document vault: a content hash lets the
-- client check "has this exact file already been uploaded for this pet"
-- before spending a storage write on it, without needing to download and
-- compare existing files.
alter table pet_documents add column if not exists content_hash text;

create index if not exists pet_documents_pet_hash_idx
  on pet_documents (pet_id, content_hash);

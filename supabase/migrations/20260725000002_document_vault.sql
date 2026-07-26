-- Document vault (Spec §5.4) — vaccination certificates, flea/worm records.
-- Private storage bucket (signed URLs only, never public) + metadata table.

-- Private bucket: public = false, so files are reachable ONLY via short-lived
-- signed URLs, never a guessable public CDN link. Certificates are sensitive.
insert into storage.buckets (id, name, public)
values ('pet-documents', 'pet-documents', false)
on conflict (id) do nothing;

-- Owner may read/write their own files. Path convention:
--   {owner_id}/{pet_id}/{random}.{ext}
-- so the first path segment is the owner's uid.
create policy "pet_documents_owner_rw" on storage.objects
  for all using (
    bucket_id = 'pet-documents'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Metadata — one row per uploaded file.
create table if not exists public.pet_documents (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets(id) on delete cascade,
  kind         text not null default 'other',  -- 'vaccination' | 'flea_worm' | 'other'
  title        text,
  file_name    text not null,
  storage_path text not null,                   -- path within the pet-documents bucket
  mime_type    text,
  size_bytes   bigint,
  uploaded_at  timestamptz not null default now()
);
create index if not exists pet_documents_pet_idx
  on public.pet_documents (pet_id, uploaded_at desc);

alter table public.pet_documents enable row level security;
create policy "pet_documents_owner" on public.pet_documents for all using (
  exists (
    select 1 from public.pets
    where pets.id = pet_documents.pet_id and pets.owner_id = auth.uid()
  )
);

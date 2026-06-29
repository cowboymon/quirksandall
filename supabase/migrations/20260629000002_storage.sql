-- Public bucket for pet profile photos
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

-- Owners can upload/replace their own pet photos (path: {owner_id}/{pet_id}.jpg)
create policy "pet_photos_owner_write" on storage.objects
  for all using (
    bucket_id = 'pet-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Public read (the bucket is public so the CDN URL works without a signed URL)
create policy "pet_photos_public_read" on storage.objects
  for select using (bucket_id = 'pet-photos');

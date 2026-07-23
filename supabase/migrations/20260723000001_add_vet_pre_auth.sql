-- The app collects a "I've pre-authorised my vet" flag (onboarding step 2 and
-- edit/emergency) and writes it to pet_vet_info.vet_pre_auth, but the column was
-- never created. Writing an unknown column makes PostgREST reject the whole
-- row (42703), so vet/emergency info could not be saved — and because the
-- onboarding finish() writes pet_vet_info before behavior/medical/routine/
-- share_links, that failure aborted the rest of the profile creation.

alter table public.pet_vet_info
  add column if not exists vet_pre_auth boolean not null default false;

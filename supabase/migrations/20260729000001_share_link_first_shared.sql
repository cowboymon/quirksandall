-- Marks the first time a link was actually shared, so the explanatory intro
-- message ("Here's everything you need for Olive…") is sent once and repeat
-- sends of the same link stay lightweight — a bare link, no re-lecturing.
-- Nullable: existing links have never been "first shared" under this scheme,
-- so their next send gets the intro, which is the desired behaviour anyway.
alter table public.share_links
  add column if not exists first_shared_at timestamptz;

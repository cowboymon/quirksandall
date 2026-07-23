-- Soft account deletion with a 30-day grace period.
--
-- When an owner asks to delete their account we stamp deletion_scheduled_at
-- rather than deleting immediately, so they can change their mind by signing
-- back in (which clears the stamp). A daily job purges anything older than the
-- grace window. Deleting the auth user cascades to owners and every pet row
-- (owners.id references auth.users(id) on delete cascade).

alter table public.owners
  add column if not exists deletion_scheduled_at timestamptz;

-- Daily purge of accounts past the 30-day grace window.
create extension if not exists pg_cron;

select cron.schedule(
  'purge-scheduled-deletions',
  '0 3 * * *',
  $$
    delete from auth.users u
    using public.owners o
    where u.id = o.id
      and o.deletion_scheduled_at is not null
      and o.deletion_scheduled_at < now() - interval '30 days'
  $$
);

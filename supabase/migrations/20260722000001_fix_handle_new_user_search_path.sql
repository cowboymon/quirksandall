-- Fix: new-user signup failed with "Database error saving new user".
-- The handle_new_user trigger ran without `public` in its search_path when
-- GoTrue (supabase_auth_admin) inserted the row, so the unqualified `owners`
-- table couldn't be resolved. Pin search_path and schema-qualify the table.
-- coalesce email so phone-only signups don't violate the NOT NULL column.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.owners (id, primary_email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

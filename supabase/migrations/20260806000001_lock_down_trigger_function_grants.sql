-- Supabase security advisor flagged handle_new_user() and rls_auto_enable()
-- as callable by `anon`/`authenticated` — Postgres grants EXECUTE on new
-- functions to PUBLIC by default. Both are SECURITY DEFINER and meant to run
-- only via their triggers (auth.users insert / RLS auto-enable), never
-- invoked directly by a client, so the default PUBLIC grant is pure excess
-- privilege with no legitimate caller. Triggers execute as the function
-- owner regardless of grants, so revoking here doesn't affect them.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

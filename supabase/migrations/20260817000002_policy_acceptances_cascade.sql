-- policy_acceptances.user_id referenced auth.users(id) WITHOUT on delete
-- cascade — discovered when a manual `delete from auth.users` hit
-- "violates foreign key constraint policy_acceptances_user_id_fkey".
--
-- This is more than a one-off annoyance: the daily purge-scheduled-deletions
-- pg_cron job (20260723000002_add_deletion_scheduled.sql) runs the exact
-- same `delete from auth.users` for any account 30+ days past its scheduled
-- deletion. Any account with a policy_acceptances row (i.e. anyone who went
-- through the terms-acceptance flow — most/all real users) would hit this
-- identical violation. pg_cron logs a failed run to cron.job_run_details
-- but doesn't alert anyone or stop the schedule, so this has plausibly been
-- silently failing to actually purge anyone since policy_acceptances was
-- introduced, despite the job itself showing as "active" and "scheduled".
--
-- Note: policy_acceptances is not created by any migration in this
-- directory — it exists in the live DB outside this migration's history
-- (found during a schema audit, 17 Aug 2026). This migration only touches
-- the one constraint; it does not attempt to document the table's full
-- shape retroactively.
alter table public.policy_acceptances
  drop constraint policy_acceptances_user_id_fkey,
  add constraint policy_acceptances_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

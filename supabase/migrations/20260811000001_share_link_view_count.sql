-- Per-link view counter.
--
-- The recipient page already stamps `last_viewed_at` on every non-preview
-- render, which answers "did they open it" but not "how often". Owners want
-- the count, and Mixpanel can't give it to them: recipient tracking is
-- deliberately anonymous and has no link identity in it, so the number has to
-- live next to the link itself.
--
-- Counted the same way `last_viewed_at` is stamped — one per page render,
-- owner previews excluded. It is a view count, not a unique-visitor count; we
-- don't identify recipients and aren't going to start.
alter table public.share_links
  add column if not exists view_count integer not null default 0;

-- Read-modify-write from the app would lose concurrent views, and PostgREST
-- can't express `set view_count = view_count + 1`. Doing both writes in one
-- statement here also halves the round trips on the render path.
create or replace function public.record_share_link_view(p_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.share_links
     set view_count = coalesce(view_count, 0) + 1,
         last_viewed_at = now()
   where id = p_link_id;
$$;

-- Trusted-server only. Left callable by anon/authenticated it would be a free
-- counter-inflation endpoint for anyone who can guess a link id, and the
-- recipient page calls it with the service key anyway. (Same reasoning as
-- 20260806000001, which revoked the default PUBLIC grants.)
revoke execute on function public.record_share_link_view(uuid) from public, anon, authenticated;
grant execute on function public.record_share_link_view(uuid) to service_role;

-- Resolve Supabase database linter warnings for exposed SECURITY DEFINER RPCs.
-- Keep admin workflows protected while preserving public duplicate-check behavior.

-- Admin RPCs remain SECURITY DEFINER, but explicitly limit execute surface.
revoke execute on function public.create_race_with_points(text, text, text[]) from anon;
revoke execute on function public.approve_signup_to_race_atomic(uuid, uuid) from anon;
grant execute on function public.create_race_with_points(text, text, text[]) to authenticated;
grant execute on function public.approve_signup_to_race_atomic(uuid, uuid) to authenticated;

-- Public duplicate check should obey caller privileges/RLS.
alter function public.team_signup_has_recent_duplicate(text, text, text, integer)
  security invoker;

revoke all on function public.team_signup_has_recent_duplicate(text, text, text, integer) from public;
grant execute on function public.team_signup_has_recent_duplicate(text, text, text, integer)
  to anon, authenticated;

-- SECURITY INVOKER requires direct SELECT privileges for underlying table access.
grant select on public.team_signup_requests to anon;

-- Constrain public read surface to the duplicate-screening recency window.
drop policy if exists team_signup_requests_duplicate_check_recent_read on public.team_signup_requests;
create policy team_signup_requests_duplicate_check_recent_read
  on public.team_signup_requests
  for select
  to anon, authenticated
  using (
    submitted_at > now() - interval '168 hours'
  );
